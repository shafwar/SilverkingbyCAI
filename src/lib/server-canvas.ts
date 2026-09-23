/**
 * Server-side canvas for QR / Serticard rasterization.
 *
 * Production (Railway): uses node-canvas when native bindings are present — unchanged.
 * Local dev only: falls back to @napi-rs/canvas when node-canvas bindings are missing.
 *
 * Native modules are loaded with webpackIgnore so Next.js does not try to bundle .node binaries.
 */

/** Minimal canvas surface shared by node-canvas and @napi-rs/canvas (dev fallback). */
export type ServerCanvasModule = {
  createCanvas: (width: number, height: number) => any;
  loadImage: (src: string | Buffer) => Promise<any>;
  registerFont?: (path: string, meta: { family: string }) => void;
};

let modulePromise: Promise<ServerCanvasModule | null> | null = null;

function asCanvasModule(mod: unknown): ServerCanvasModule | null {
  if (
    mod &&
    typeof mod === "object" &&
    typeof (mod as ServerCanvasModule).createCanvas === "function" &&
    typeof (mod as ServerCanvasModule).loadImage === "function"
  ) {
    return mod as ServerCanvasModule;
  }
  return null;
}

async function tryLoadNodeCanvas(): Promise<ServerCanvasModule | null> {
  try {
    const mod = await import(/* webpackIgnore: true */ "canvas");
    return asCanvasModule(mod);
  } catch {
    return null;
  }
}

async function tryLoadNapiCanvas(): Promise<ServerCanvasModule | null> {
  try {
    const mod = await import(/* webpackIgnore: true */ "@napi-rs/canvas/node-canvas");
    const parsed = asCanvasModule(mod);
    if (parsed) return parsed;
  } catch {
    // try main entry below
  }
  try {
    const mod = await import(/* webpackIgnore: true */ "@napi-rs/canvas");
    return asCanvasModule(mod);
  } catch {
    return null;
  }
}

/**
 * Resolve a canvas implementation for server-side image/PDF generation.
 * Prefers node-canvas; uses @napi-rs/canvas only in development when node-canvas is unavailable.
 */
export async function getServerCanvasModule(): Promise<ServerCanvasModule | null> {
  if (!modulePromise) {
    modulePromise = (async () => {
      const primary = await tryLoadNodeCanvas();
      if (primary) return primary;

      if (process.env.NODE_ENV === "development") {
        const fallback = await tryLoadNapiCanvas();
        if (fallback) {
          console.warn(
            "[ServerCanvas] node-canvas unavailable in development; using @napi-rs/canvas fallback."
          );
          return fallback;
        }
      }

      return null;
    })();
  }
  return modulePromise;
}
