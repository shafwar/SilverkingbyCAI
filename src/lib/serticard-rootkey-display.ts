/**
 * Root-key pill should not show placeholder / invalid values (e.g. all zeros).
 */
export function normalizeRootKeyForPill(raw: string | null | undefined): string | null {
  if (raw == null) return null;
  const s = String(raw).trim();
  if (s.length === 0) return null;
  if (/^0+$/i.test(s)) return null;
  return s.toUpperCase();
}
