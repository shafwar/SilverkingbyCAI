/** Shared client-side admin check — one in-flight network request per tab. */

const STORAGE_KEY = "isAdmin";
let inFlight: Promise<boolean> | null = null;
let memoryCache: boolean | null = null;

export function readAdminStatusCache(): boolean | null {
  if (memoryCache !== null) return memoryCache;
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (raw === null) return null;
    return raw === "true";
  } catch {
    return null;
  }
}

export function writeAdminStatusCache(isAdmin: boolean): void {
  memoryCache = isAdmin;
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(STORAGE_KEY, String(isAdmin));
  } catch {
    /* ignore */
  }
}

export function clearAdminStatusCache(): void {
  memoryCache = null;
  if (typeof window === "undefined") return;
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

/** Always hits /api/admin/me once (deduped); updates sessionStorage. */
export async function fetchAdminStatusNetwork(): Promise<boolean> {
  if (inFlight) return inFlight;

  inFlight = (async () => {
    try {
      const res = await fetch("/api/admin/me", { cache: "no-store" });
      if (!res.ok) {
        writeAdminStatusCache(false);
        return false;
      }
      const data = await res.json();
      const isAdmin = data?.isAdmin === true;
      writeAdminStatusCache(isAdmin);
      return isAdmin;
    } catch {
      const cached = readAdminStatusCache();
      if (cached !== null) return cached;
      writeAdminStatusCache(false);
      return false;
    } finally {
      inFlight = null;
    }
  })();

  return inFlight;
}
