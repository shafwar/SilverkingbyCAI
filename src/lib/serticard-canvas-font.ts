/**
 * node-canvas only resolves fonts installed on the server. Admin-chosen names
 * (e.g. Lucida Sans, SF Mono) often render as tofu/empty on Linux — map to safe families.
 */
export function getCanvasPdfSansFamily(configured: string | null | undefined): string {
  const f = (configured || "").trim();
  const u = f.toLowerCase();
  if (u.includes("times")) return "Times New Roman";
  if (u.includes("lucida")) return "Arial";
  if (u.includes("sf mono") || u === "sf mono") return "Arial";
  if (u === "helvetica") return "Arial";
  return f.length > 0 ? f : "Arial";
}

/** Monospace for serial / root key — broad glyph coverage on server builds */
export function getCanvasPdfMonoFamily(): string {
  return "Courier New";
}
