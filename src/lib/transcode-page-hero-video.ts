/**
 * Re-encode uploaded hero videos for web: H.264, capped 1080p, faststart, no audio.
 * Matches the quality target of scripts/compress-public-videos.ts (CRF ~22–23).
 * Returns null if ffmpeg is missing or fails — caller should upload the original file.
 */

import { execFile } from "node:child_process";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

const MAX_W = 1920;
/** Sharper hero loops while staying under 20 MB on typical uploads */
const CRF = 19;
const FFMPEG_TIMEOUT_MS = 120_000;

/**
 * @param inputBuffer Raw uploaded video bytes (mp4/webm)
 * @param inputFilename Original name (used only for temp input extension)
 */
export async function transcodePageHeroVideoForWeb(
  inputBuffer: Buffer,
  inputFilename: string
): Promise<Buffer | null> {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "sk-hero-vid-"));
  const ext = path.extname(inputFilename) || ".mp4";
  const inPath = path.join(dir, `input${ext}`);
  const outPath = path.join(dir, "output.mp4");

  try {
    fs.writeFileSync(inPath, inputBuffer);

    await execFileAsync(
      "ffmpeg",
      [
        "-hide_banner",
        "-loglevel",
        "error",
        "-y",
        "-i",
        inPath,
        "-c:v",
        "libx264",
        "-crf",
        String(CRF),
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
        outPath,
      ],
      {
        maxBuffer: 100 * 1024 * 1024,
        timeout: FFMPEG_TIMEOUT_MS,
      }
    );

    if (!fs.existsSync(outPath)) return null;
    const out = fs.readFileSync(outPath);
    return out.length > 0 ? out : null;
  } catch (e) {
    console.warn("[transcodePageHeroVideoForWeb] ffmpeg skipped or failed:", e);
    return null;
  } finally {
    try {
      fs.rmSync(dir, { recursive: true, force: true });
    } catch {
      /* ignore */
    }
  }
}
