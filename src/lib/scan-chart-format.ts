import type { ScanChartViewMode } from "@/components/admin/scan-dashboard-types";
import {
  endOfLocalDay,
  formatDateRange,
  formatLongDate,
  formatShortDate,
  rollingWindowStart,
  startOfLocalDay,
} from "@/lib/scan-period-utils";

export type ScanTrendPoint = {
  date: string;
  isoDate?: string;
  hour?: number;
  count: number;
  page1Count?: number;
  page2Count?: number;
};

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

function parseIsoDate(iso?: string): Date | null {
  if (!iso) return null;
  const d = new Date(`${iso}T12:00:00`);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function getChartPeriodRange(
  viewMode: ScanChartViewMode,
  now = new Date()
): { start: Date; end: Date } {
  const end = endOfLocalDay(now);
  if (viewMode === "today") {
    return { start: startOfLocalDay(now), end };
  }
  if (viewMode === "7d") {
    return { start: rollingWindowStart(now, 7), end };
  }
  if (viewMode === "30d") {
    return { start: rollingWindowStart(now, 30), end };
  }
  const start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
  return { start, end };
}

export function formatChartPeriodLabel(
  viewMode: ScanChartViewMode,
  t: (key: string) => string,
  now = new Date()
): string {
  const { start, end } = getChartPeriodRange(viewMode, now);
  if (viewMode === "today") {
    return formatLongDate(now);
  }
  if (viewMode === "7d") {
    return formatDateRange(start, end);
  }
  if (viewMode === "30d") {
    return formatDateRange(start, end);
  }
  const monthName = now.toLocaleDateString("en-GB", { month: "long" });
  return `${monthName} · ${formatDateRange(start, end)}`;
}

export function formatChartPeriodTitle(viewMode: ScanChartViewMode, t: (key: string) => string): string {
  if (viewMode === "today") return t("viewMode.today");
  if (viewMode === "7d") return t("viewMode.7d");
  if (viewMode === "30d") return t("viewMode.30d");
  return t("viewMode.month");
}

export function formatTrendXAxisTick(
  point: ScanTrendPoint,
  viewMode: ScanChartViewMode,
  index: number,
  total: number
): string {
  if (viewMode === "today") {
    const hour = point.hour ?? index;
    if (hour % 2 !== 0) return "";
    return `${String(hour).padStart(2, "0")}:00`;
  }

  const d = parseIsoDate(point.isoDate);
  if (!d) return point.date;

  if (viewMode === "7d") {
    const day = DAY_NAMES[d.getDay()];
    return `${day} ${d.getDate()}`;
  }

  if (viewMode === "30d") {
    if (total <= 12 || index % Math.ceil(total / 8) === 0 || index === total - 1) {
      return formatShortDate(d);
    }
    return "";
  }

  if (total <= 15 || index % Math.ceil(total / 10) === 0 || index === total - 1) {
    return formatShortDate(d);
  }
  return "";
}

export function formatTrendTooltipLabel(point: ScanTrendPoint, viewMode: ScanChartViewMode): string {
  if (viewMode === "today") {
    const hour = point.hour ?? 0;
    const d = new Date();
    d.setHours(hour, 0, 0, 0);
    return d.toLocaleString("en-GB", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }
  const d = parseIsoDate(point.isoDate);
  if (d) return formatLongDate(d);
  return point.date;
}

export function formatTrendTooltipValue(count: number, t: (key: string) => string): string {
  return `${count.toLocaleString()} ${t("scansLabel")}`;
}
