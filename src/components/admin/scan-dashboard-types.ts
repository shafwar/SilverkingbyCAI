/** Rolling windows only — no calendar month on the scans metric card. */
export type ScanPeriodMode = "today" | "7d" | "30d";

export type ScanChartViewMode = "7d" | "30d" | "month";

export function scanPeriodToChartView(period: ScanPeriodMode): ScanChartViewMode {
  if (period === "30d") return "30d";
  if (period === "7d") return "7d";
  return "7d";
}

export function nextScanPeriod(period: ScanPeriodMode): ScanPeriodMode {
  if (period === "today") return "7d";
  if (period === "7d") return "30d";
  return "today";
}
