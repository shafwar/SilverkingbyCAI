/**
 * Hints from Network Information API (when available) for lighter UX on slow links.
 * Not available in all browsers — default to "fast".
 */
export type NetworkTier = "fast" | "medium" | "slow";

type NavConnection = {
  saveData?: boolean;
  effectiveType?: string;
  downlink?: number;
};

export function getNetworkTier(): NetworkTier {
  if (typeof navigator === "undefined") return "fast";
  const c = (navigator as Navigator & { connection?: NavConnection }).connection;
  if (!c) return "fast";
  if ("saveData" in c && c.saveData) return "slow";
  const t = c.effectiveType;
  if (t === "slow-2g" || t === "2g") return "slow";
  if (t === "3g") return "medium";
  /** Weak 4G / congested cells often still report "4g" — downlink is a useful hint */
  if (typeof c.downlink === "number" && c.downlink > 0 && c.downlink < 1.5) {
    return "medium";
  }
  return "fast";
}
