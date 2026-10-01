/**
 * Unified server-side canvas adapter for QR / Serticard rasterization.
 *
 * Prioritizes @napi-rs/canvas (Rust Skia engine) for:
 * 1. Superior memory efficiency (zero Cairo C++ heap fragmentation).
 * 2. Cross-platform support (Railway, Vercel Serverless, and local dev).
 *
 * Gracefully falls back to node-canvas if @napi-rs/canvas is unavailable.
 * Native modules are loaded with webpackIgnore so Next.js does not bundle .node binaries.
 */

export type ServerCanvasModule = {
  createCanvas: (width: number, height: number) => any;
  loadImage: (src: string | Buffer) => Promise<any>;
  registerFont?: (path: string, meta: { family: string } | string) => boolean | void;
  backendName: "napi-rs" | "node-canvas";
};

let modulePromise: Promise<ServerCanvasModule | null> | null = null;

async function tryLoadNapiCanvas(): Promise<ServerCanvasModule | null> {
  try {
    const mod = (await import(/* webpackIgnore: true */ "@napi-rs/canvas")) as any;
    if (mod && typeof mod.createCanvas === "function" && typeof mod.loadImage === "function") {
      return {
        createCanvas: (w: number, h: number) => mod.createCanvas(w, h),
        loadImage: (src: string | Buffer) => mod.loadImage(src),
        registerFont: (fontPath: string, meta: { family: string } | string) => {
          const family = typeof meta === "string" ? meta : meta?.family;
          if (mod.GlobalFonts && typeof mod.GlobalFonts.registerFromPath === "function") {
            return mod.GlobalFonts.registerFromPath(fontPath, family);
          }
          return false;
        },
        backendName: "napi-rs",
      };
    }
    return null;
  } catch {
    return null;
  }
}

async function tryLoadNodeCanvas(): Promise<ServerCanvasModule | null> {
  try {
    const mod = (await import(/* webpackIgnore: true */ "canvas")) as any;
    if (mod && typeof mod.createCanvas === "function" && typeof mod.loadImage === "function") {
      return {
        createCanvas: (w: number, h: number) => mod.createCanvas(w, h),
        loadImage: (src: string | Buffer) => mod.loadImage(src),
        registerFont: (fontPath: string, meta: { family: string } | string) => {
          const familyMeta = typeof meta === "string" ? { family: meta } : meta;
          if (typeof mod.registerFont === "function") {
            mod.registerFont(fontPath, familyMeta);
            return true;
          }
          return false;
        },
        backendName: "node-canvas",
      };
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Resolve canvas implementation.
 * Prioritizes @napi-rs/canvas for optimal memory usage and Vercel compatibility,
 * with automatic fallback to node-canvas.
 */
export async function getServerCanvasModule(): Promise<ServerCanvasModule | null> {
  if (!modulePromise) {
    modulePromise = (async () => {
      // 1. Primary: @napi-rs/canvas (lightweight Rust/Skia engine, low RAM footprint)
      const napi = await tryLoadNapiCanvas();
      if (napi) {
        return napi;
      }

      // 2. Fallback: node-canvas (standard Cairo engine)
      const nodeCanvas = await tryLoadNodeCanvas();
      if (nodeCanvas) {
        return nodeCanvas;
      }

      return null;
    })();
  }
  return modulePromise;
}

