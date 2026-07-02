/**
 * Re-encode uploaded hero videos for web — Merchandise CMS standard.
 * H.264 1080p, 15s loop, ~5–6 MB target, faststart, no audio.
 */

import { execFile } from "node:child_process";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { promisify } from "node:util";
import { HERO_CMS_VIDEO } from "@/lib/hero-cms-spec";

const execFileAsync = promisify(execFile);

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
      sourceDurationSeconds > HERO_CMS_VIDEO.maxInputDurationSeconds
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

    const publishSeconds = HERO_CMS_VIDEO.publishDurationSeconds;
    const trimmed = (sourceDurationSeconds ?? 0) > publishSeconds;
    let chosenBuffer: Buffer | null = null;
    let chosenCrf: number | null = null;
    let outputDurationSeconds: number | null = null;

    for (const crf of HERO_CMS_VIDEO.crfSteps) {
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
        ffmpegArgs.push("-t", String(publishSeconds));
      }

      ffmpegArgs.push(
        "-c:v",
        "libx264",
        "-crf",
        String(crf),
        "-preset",
        HERO_CMS_VIDEO.preset,
        "-vf",
        `scale='min(${HERO_CMS_VIDEO.maxWidth},iw)':-2:flags=lanczos`,
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
        timeout: HERO_CMS_VIDEO.ffmpegTimeoutMs,
      });

      if (!fs.existsSync(outPath)) continue;
      const out = fs.readFileSync(outPath);
      if (!out.length) continue;

      chosenBuffer = out;
      chosenCrf = crf;
      outputDurationSeconds = await probeDurationSeconds(outPath);

      if (out.length <= HERO_CMS_VIDEO.idealOutputBytes) {
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

    if (chosenBuffer.length > HERO_CMS_VIDEO.maxOutputBytes) {
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
