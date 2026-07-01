/**
 * Extract a single WebP poster frame from a hero video buffer (admin upload only).
 */

import { execFile } from "node:child_process";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

const FFMPEG_TIMEOUT_MS = 60_000;
const POSTER_MAX_WIDTH = 1920;
const POSTER_QUALITY = 92;

export async function extractHeroPosterWebpFromVideo(
  videoBuffer: Buffer,
  inputFilename = "hero.mp4"
): Promise<Buffer | null> {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "sk-hero-poster-"));
  const ext = path.extname(inputFilename) || ".mp4";
  const inPath = path.join(dir, `input${ext}`);
  const outPath = path.join(dir, "poster.webp");

  try {
    fs.writeFileSync(inPath, videoBuffer);

    await execFileAsync(
      "ffmpeg",
      [
        "-hide_banner",
        "-loglevel",
        "error",
        "-y",
        "-ss",
        "00:00:00.5",
        "-i",
        inPath,
        "-vframes",
        "1",
        "-vf",
        `scale=${POSTER_MAX_WIDTH}:-2:flags=lanczos`,
        "-c:v",
        "libwebp",
        "-quality",
        String(POSTER_QUALITY),
        outPath,
      ],
      { maxBuffer: 20 * 1024 * 1024, timeout: FFMPEG_TIMEOUT_MS }
    );

    if (!fs.existsSync(outPath)) return null;
    const out = fs.readFileSync(outPath);
    return out.length > 0 ? out : null;
  } catch (e) {
    console.warn("[extractHeroPosterWebpFromVideo] ffmpeg skipped or failed:", e);
    return null;
  } finally {
    try {
      fs.rmSync(dir, { recursive: true, force: true });
    } catch {
      /* ignore */
    }
  }
}
