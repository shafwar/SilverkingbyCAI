export type ScanPeriodMode = "today" | "7d" | "30d" | "month";

export type ScanChartViewMode = "7d" | "30d" | "month";

export function scanPeriodToChartView(period: ScanPeriodMode): ScanChartViewMode {
  if (period === "7d") return "7d";
  if (period === "30d") return "30d";
  return "month";
}

export function nextScanPeriod(period: ScanPeriodMode): ScanPeriodMode {
  if (period === "today") return "7d";
  if (period === "7d") return "30d";
  if (period === "30d") return "month";
  return "today";
}
