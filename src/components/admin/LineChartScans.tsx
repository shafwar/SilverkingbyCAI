"use client";

import { useMemo, useState } from "react";
import useSWR from "swr";
import { useTranslations } from "next-intl";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  type TooltipProps,
} from "recharts";
import { motion } from "framer-motion";
import clsx from "clsx";

import { fetcher } from "@/lib/fetcher";
import { AnimatedCard } from "./AnimatedCard";
import { LoadingSkeleton } from "./LoadingSkeleton";
import { MonthYearPicker } from "./MonthYearPicker";
import { type ScanChartViewMode } from "./scan-dashboard-types";
import {
  formatChartPeriodLabel,
  formatTrendTooltipLabel,
  formatTrendTooltipValue,
  formatTrendXAxisTick,
  type ScanTrendPoint,
} from "@/lib/scan-chart-format";

type TrendResponse = {
  range: number;
  month?: number | null;
  year?: number | null;
  view?: string;
  data: ScanTrendPoint[];
};

type LineChartScansProps = {
  viewMode: ScanChartViewMode;
  onViewModeChange: (mode: ScanChartViewMode) => void;
};

function ScanTrendTooltip({
  active,
  payload,
  viewMode,
  t,
}: TooltipProps<number, string> & {
  viewMode: ScanChartViewMode;
  t: (key: string) => string;
}) {
  if (!active || !payload?.length) return null;
  const point = payload[0]?.payload as ScanTrendPoint | undefined;
  if (!point) return null;

  return (
    <div className="rounded-xl border border-white/15 bg-[#0a0a0a]/95 px-3.5 py-2.5 shadow-xl backdrop-blur-md">
      <p className="text-[11px] font-medium text-white/55">
        {formatTrendTooltipLabel(point, viewMode)}
      </p>
      <p className="mt-1 text-sm font-semibold text-[#FFD700]">
        {formatTrendTooltipValue(point.count, t)}
      </p>
    </div>
  );
}

export function LineChartScans({ viewMode, onViewModeChange }: LineChartScansProps) {
  const t = useTranslations("admin.charts");
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());

  const apiUrl = useMemo(() => {
    if (viewMode === "today") return `/api/admin/scans/trend?range=today`;
    if (viewMode === "7d") return `/api/admin/scans/trend?range=7`;
    if (viewMode === "30d") return `/api/admin/scans/trend?range=30`;
    return `/api/admin/scans/trend?month=${month}&year=${year}`;
  }, [viewMode, month, year]);

  const shouldRefresh = useMemo(() => {
    if (viewMode === "today" || viewMode === "7d" || viewMode === "30d") return true;
    const currentDate = new Date();
    return year === currentDate.getFullYear() && month === currentDate.getMonth() + 1;
  }, [viewMode, month, year]);

  const { data, error, isLoading, mutate } = useSWR<TrendResponse>(apiUrl, fetcher, {
    refreshInterval: shouldRefresh ? 30000 : 0,
    revalidateOnFocus: shouldRefresh,
    revalidateOnReconnect: true,
    dedupingInterval: 5000,
  });

  const handleMonthYearChange = (newMonth: number, newYear: number) => {
    setMonth(newMonth);
    setYear(newYear);
    onViewModeChange("month");
    mutate();
  };

  const handleViewModeChange = (mode: ScanChartViewMode) => {
    onViewModeChange(mode);
    mutate();
  };

  const chartData = data?.data ?? [];
  const loading = isLoading;
  const hasError = error;
  const periodLabel = formatChartPeriodLabel(viewMode, t);

  const xTickInterval = useMemo(() => {
    if (viewMode === "today") return 1;
    if (viewMode === "7d") return 0;
    if (viewMode === "30d") return Math.max(0, Math.floor(chartData.length / 8) - 1);
    return Math.max(0, Math.floor(chartData.length / 10) - 1);
  }, [viewMode, chartData.length]);

  return (
    <AnimatedCard>
      <div className="mb-4 sm:mb-5 flex flex-col gap-3 sm:gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="text-[10px] sm:text-xs uppercase tracking-[0.28em] sm:tracking-[0.32em] text-white/45">
            {t("verificationVolume")}
          </p>
          <h3 className="mt-1.5 sm:mt-2 text-lg sm:text-xl md:text-2xl font-semibold tracking-tight text-white">
            {t("scanTrajectory")}
          </h3>
          <p className="mt-1.5 text-xs sm:text-sm text-white/50">{periodLabel}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <div className="flex items-center gap-0.5 sm:gap-1 rounded-full border border-white/10 bg-white/[0.04] p-0.5 sm:p-1">
            {(["today", "7d", "30d", "month"] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => handleViewModeChange(mode)}
                className={clsx(
                  "rounded-full px-2.5 sm:px-3 md:px-4 py-1 sm:py-1.5 text-[10px] sm:text-xs md:text-sm font-medium transition active:scale-95 touch-manipulation",
                  viewMode === mode
                    ? "bg-[#FFD700] text-black shadow-sm"
                    : "text-white/60 hover:bg-white/10 hover:text-white"
                )}
              >
                {t(`viewMode.${mode}`)}
              </button>
            ))}
          </div>
          {viewMode === "month" && (
            <MonthYearPicker month={month} year={year} onChange={handleMonthYearChange} />
          )}
        </div>
      </div>

      {loading && <LoadingSkeleton className="h-52 sm:h-64 md:h-72 w-full" />}

      {hasError && (
        <p className="text-sm text-red-400">Failed to load scans trend. Please refresh.</p>
      )}

      {!loading && !hasError && chartData.length === 0 && (
        <p className="py-16 text-center text-sm text-white/40">{t("noData")}</p>
      )}

      {!!chartData.length && !loading && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.05 }}
          className="h-52 sm:h-64 md:h-72 w-full"
        >
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 8, right: 8, left: -8, bottom: 4 }}>
              <defs>
                <linearGradient id="scanLineGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#FFD700" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="#FFD700" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} strokeDasharray="3 6" />
              <XAxis
                dataKey="date"
                stroke="rgba(255,255,255,0.35)"
                tickLine={false}
                axisLine={false}
                interval={xTickInterval}
                tick={{ fill: "rgba(255,255,255,0.55)", fontSize: 11 }}
                tickMargin={10}
                tickFormatter={(_, index) =>
                  formatTrendXAxisTick(chartData[index] ?? { date: "", count: 0 }, viewMode, index, chartData.length)
                }
              />
              <YAxis
                stroke="rgba(255,255,255,0.35)"
                tickLine={false}
                axisLine={false}
                width={36}
                tick={{ fill: "rgba(255,255,255,0.55)", fontSize: 11 }}
                tickMargin={8}
                allowDecimals={viewMode === "today"}
              />
              <Tooltip
                cursor={{ stroke: "rgba(255,255,255,0.12)", strokeWidth: 1 }}
                content={<ScanTrendTooltip viewMode={viewMode} t={t} />}
              />
              <Line
                type="monotone"
                dataKey="count"
                stroke="#FFD700"
                strokeWidth={2.5}
                dot={false}
                activeDot={{
                  r: 5,
                  stroke: "#FFD700",
                  strokeWidth: 2,
                  fill: "#0a0a0a",
                }}
                fill="url(#scanLineGradient)"
              />
            </LineChart>
          </ResponsiveContainer>
        </motion.div>
      )}
    </AnimatedCard>
  );
}
