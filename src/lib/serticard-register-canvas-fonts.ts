import path from "path";

let didRegister = false;

/** Bundled font families for Serticard PDF rasterization (node-canvas / Pango). */
export const SERTICARD_CANVAS_SANS_FAMILY = "SerticardPdfSans";
export const SERTICARD_CANVAS_MONO_FAMILY = "SerticardPdfMono";

/**
 * Register TTF/OTF from /public/fonts so product name + serial render on Linux/Docker
 * (system "Arial" / "Courier New" names often produce tofu without fontconfig).
 * Idempotent per process.
 */
export function ensureSerticardPdfCanvasFontsRegistered(canvasMod: {
  registerFont?: (p: string, meta: { family: string }) => void;
}): void {
  if (didRegister) return;
  didRegister = true;
  if (typeof canvasMod.registerFont !== "function") return;
  const root = process.cwd();
  const sansPath = path.join(root, "public", "fonts", "LucidaSans.ttf");
  const monoPath = path.join(root, "public", "fonts", "SFMono-Regular.otf");
  try {
    canvasMod.registerFont(sansPath, { family: SERTICARD_CANVAS_SANS_FAMILY });
  } catch (e) {
    console.warn("[Serticard fonts] Failed to register sans font:", sansPath, e);
  }
  try {
    canvasMod.registerFont(monoPath, { family: SERTICARD_CANVAS_MONO_FAMILY });
  } catch (e) {
    console.warn("[Serticard fonts] Failed to register mono font:", monoPath, e);
  }
}
