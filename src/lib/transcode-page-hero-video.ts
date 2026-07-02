/**
 * Re-encode uploaded hero videos for web: H.264, capped 1080p, faststart, no audio.
 * Admin can upload a larger master, but the published hero stays short and web-friendly.
 */

import { execFile } from "node:child_process";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

const MAX_W = 1920;
const MAX_VIDEO_DURATION_SECONDS = 60;
const TRIM_TARGET_SECONDS = 20;
const OUTPUT_TARGET_BYTES = 30 * 1024 * 1024;
const CRF_STEPS = [19, 21, 23] as const;
const FFMPEG_TIMEOUT_MS = 300_000;

export type HeroVideoProbe = {
  durationSeconds: number | null;
};

export type HeroVideoTranscodeFailure =
  | "ffmpeg_missing"
  | "duration_exceeded"
  | "transcode_failed"
  | "output_too_large";

export type HeroVideoTranscodeResult = {
  buffer: Buffer | null;
  sourceDurationSeconds: number | null;
  outputDurationSeconds: number | null;
  trimmed: boolean;
  finalCrf: number | null;
  failure?: HeroVideoTranscodeFailure;
};

let ffmpegAvailableCache: boolean | null = null;

/** Cached check — hero upload needs ffmpeg + ffprobe on the server (Railway, etc.). */
export async function isFfmpegAvailable(): Promise<boolean> {
  if (ffmpegAvailableCache != null) return ffmpegAvailableCache;
  try {
    await execFileAsync("ffmpeg", ["-version"], { timeout: 10_000 });
    await execFileAsync("ffprobe", ["-version"], { timeout: 10_000 });
    ffmpegAvailableCache = true;
  } catch {
    ffmpegAvailableCache = false;
  }
  return ffmpegAvailableCache;
}

function parseDurationSeconds(raw: string): number | null {
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) return null;
  return n;
}

async function probeDurationSeconds(inputPath: string): Promise<number | null> {
  try {
    const { stdout } = await execFileAsync(
      "ffprobe",
      [
        "-v",
        "error",
        "-show_entries",
        "format=duration",
        "-of",
        "default=noprint_wrappers=1:nokey=1",
        inputPath,
      ],
      {
        maxBuffer: 1024 * 1024,
        timeout: 30_000,
      }
    );
    return parseDurationSeconds(String(stdout).trim());
  } catch (e) {
    console.warn("[probeDurationSeconds] ffprobe failed:", e);
    return null;
  }
}

export async function probeHeroVideo(inputBuffer: Buffer, inputFilename: string): Promise<HeroVideoProbe> {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "sk-hero-probe-"));
  const ext = path.extname(inputFilename) || ".mp4";
  const inPath = path.join(dir, `input${ext}`);

  try {
    fs.writeFileSync(inPath, inputBuffer);
    const durationSeconds = await probeDurationSeconds(inPath);
    return { durationSeconds };
  } finally {
    try {
      fs.rmSync(dir, { recursive: true, force: true });
    } catch {
      /* ignore */
    }
  }
}

/**
 * @param inputBuffer Raw uploaded video bytes (mp4/webm)
 * @param inputFilename Original name (used only for temp input extension)
 */
export async function transcodePageHeroVideoForWeb(
  inputBuffer: Buffer,
  inputFilename: string
): Promise<HeroVideoTranscodeResult> {
  if (!(await isFfmpegAvailable())) {
    console.error("[transcodePageHeroVideoForWeb] ffmpeg/ffprobe not found on server");
    return {
      buffer: null,
      sourceDurationSeconds: null,
      outputDurationSeconds: null,
      trimmed: false,
      finalCrf: null,
      failure: "ffmpeg_missing",
    };
  }

  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "sk-hero-vid-"));
  const ext = path.extname(inputFilename) || ".mp4";
  const inPath = path.join(dir, `input${ext}`);

  try {
    fs.writeFileSync(inPath, inputBuffer);
    const sourceDurationSeconds = await probeDurationSeconds(inPath);

    if (
      sourceDurationSeconds != null &&
      sourceDurationSeconds > MAX_VIDEO_DURATION_SECONDS
    ) {
      return {
        buffer: null,
        sourceDurationSeconds,
        outputDurationSeconds: null,
        trimmed: false,
        finalCrf: null,
        failure: "duration_exceeded",
      };
    }

    const trimmed = (sourceDurationSeconds ?? 0) > TRIM_TARGET_SECONDS;
    let chosenBuffer: Buffer | null = null;
    let chosenCrf: number | null = null;
    let outputDurationSeconds: number | null = null;

    for (const crf of CRF_STEPS) {
      const outPath = path.join(dir, `output-crf-${crf}.mp4`);
      const ffmpegArgs = [
        "-hide_banner",
        "-loglevel",
        "error",
        "-y",
        "-i",
        inPath,
      ];

      if (trimmed) {
        ffmpegArgs.push("-t", String(TRIM_TARGET_SECONDS));
      }

      ffmpegArgs.push(
        "-c:v",
        "libx264",
        "-crf",
        String(crf),
        "-preset",
        "fast",
        "-vf",
        `scale='min(${MAX_W},iw)':-2:flags=lanczos`,
        "-pix_fmt",
        "yuv420p",
        "-profile:v",
        "high",
        "-movflags",
        "+faststart",
        "-an",
        outPath
      );

      await execFileAsync("ffmpeg", ffmpegArgs, {
        maxBuffer: 100 * 1024 * 1024,
        timeout: FFMPEG_TIMEOUT_MS,
      });

      if (!fs.existsSync(outPath)) continue;
      const out = fs.readFileSync(outPath);
      if (!out.length) continue;

      chosenBuffer = out;
      chosenCrf = crf;
      outputDurationSeconds = await probeDurationSeconds(outPath);

      if (out.length <= OUTPUT_TARGET_BYTES) {
        break;
      }
    }

    if (!chosenBuffer?.length) {
      return {
        buffer: null,
        sourceDurationSeconds,
        outputDurationSeconds: null,
        trimmed,
        finalCrf: null,
        failure: "transcode_failed",
      };
    }

    if (chosenBuffer.length > OUTPUT_TARGET_BYTES) {
      return {
        buffer: null,
        sourceDurationSeconds,
        outputDurationSeconds,
        trimmed,
        finalCrf: chosenCrf,
        failure: "output_too_large",
      };
    }

    return {
      buffer: chosenBuffer,
      sourceDurationSeconds,
      outputDurationSeconds,
      trimmed,
      finalCrf: chosenCrf,
    };
  } catch (e) {
    console.warn("[transcodePageHeroVideoForWeb] ffmpeg skipped or failed:", e);
    return {
      buffer: null,
      sourceDurationSeconds: null,
      outputDurationSeconds: null,
      trimmed: false,
      finalCrf: null,
      failure: "transcode_failed",
    };
  } finally {
    try {
      fs.rmSync(dir, { recursive: true, force: true });
    } catch {
      /* ignore */
    }
  }
}
