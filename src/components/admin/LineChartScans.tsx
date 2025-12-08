"use client";

import { useState, useMemo } from "react";
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
} from "recharts";
import { motion } from "framer-motion";
import clsx from "clsx";

import { fetcher } from "@/lib/fetcher";
import { AnimatedCard } from "./AnimatedCard";
import { LoadingSkeleton } from "./LoadingSkeleton";
import { MonthYearPicker } from "./MonthYearPicker";

type TrendResponse = {
  range: number;
  month?: number | null;
  year?: number | null;
  data: { date: string; count: number; page1Count?: number; page2Count?: number }[];
};

type ViewMode = "7d" | "30d" | "month";

export function LineChartScans() {
  const t = useTranslations("admin.charts");
  const now = new Date();
  const [viewMode, setViewMode] = useState<ViewMode>("month");
  const [month, setMonth] = useState(now.getMonth() + 1); // 1-indexed
  const [year, setYear] = useState(now.getFullYear());

  // Build API URL based on view mode
  const apiUrl = useMemo(() => {
    if (viewMode === "7d") {
      return `/api/admin/scans/trend?range=7`;
    } else if (viewMode === "30d") {
      return `/api/admin/scans/trend?range=30`;
    } else {
      return `/api/admin/scans/trend?month=${month}&year=${year}`;
    }
  }, [viewMode, month, year]);

  // Check if viewing current month - only real-time updates for current month or recent days
  const shouldRefresh = useMemo(() => {
    if (viewMode === "7d" || viewMode === "30d") {
      return true; // Always refresh for recent days view
    }
    const currentDate = new Date();
    return year === currentDate.getFullYear() && month === currentDate.getMonth() + 1;
  }, [viewMode, month, year]);

  const { data, error, isLoading, mutate } = useSWR<TrendResponse>(apiUrl, fetcher, {
    // Only refresh in real-time for current month or recent days (every 30 seconds)
    // History months don't need real-time updates
    refreshInterval: shouldRefresh ? 30000 : 0,
    revalidateOnFocus: shouldRefresh, // Revalidate on focus only for current data
    revalidateOnReconnect: true, // Always revalidate when connection is restored
    dedupingInterval: 5000, // Dedupe requests within 5 seconds
  });

  const handleMonthYearChange = (newMonth: number, newYear: number) => {
    setMonth(newMonth);
    setYear(newYear);
    setViewMode("month"); // Switch to month view when using month picker
    // Immediately fetch new data when month changes
    mutate();
  };

  const handleViewModeChange = (mode: ViewMode) => {
    setViewMode(mode);
    mutate();
  };

  const chartData = data?.data ?? [];
  const loading = isLoading;
  const hasError = error;

  return (
    <AnimatedCard>
      <div className="mb-4 sm:mb-6 flex flex-col gap-3 sm:gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-[10px] sm:text-xs uppercase tracking-[0.3em] sm:tracking-[0.35em] text-white/50">
            {t("verificationVolume")}
          </p>
          <h3 className="mt-1.5 sm:mt-2 text-lg sm:text-xl md:text-2xl font-semibold text-white">
            {t("scanTrajectory")}
          </h3>
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          {/* Quick range buttons */}
          <div className="flex items-center gap-1 sm:gap-2 rounded-full border border-white/10 bg-white/5 p-0.5 sm:p-1">
            <button
              onClick={() => handleViewModeChange("7d")}
              className={clsx(
                "rounded-full px-2.5 sm:px-3 md:px-4 py-1 sm:py-1.5 text-[10px] sm:text-xs md:text-sm font-medium transition active:scale-95 touch-manipulation",
                viewMode === "7d"
                  ? "bg-[#FFD700] text-black"
                  : "text-white/60 hover:text-white hover:bg-white/10"
              )}
            >
              {t("viewMode.7d")}
            </button>
            <button
              onClick={() => handleViewModeChange("30d")}
              className={clsx(
                "rounded-full px-2.5 sm:px-3 md:px-4 py-1 sm:py-1.5 text-[10px] sm:text-xs md:text-sm font-medium transition active:scale-95 touch-manipulation",
                viewMode === "30d"
                  ? "bg-[#FFD700] text-black"
                  : "text-white/60 hover:text-white hover:bg-white/10"
              )}
            >
              {t("viewMode.30d")}
            </button>
            <button
              onClick={() => handleViewModeChange("month")}
              className={clsx(
                "rounded-full px-2.5 sm:px-3 md:px-4 py-1 sm:py-1.5 text-[10px] sm:text-xs md:text-sm font-medium transition active:scale-95 touch-manipulation",
                viewMode === "month"
                  ? "bg-[#FFD700] text-black"
                  : "text-white/60 hover:text-white hover:bg-white/10"
              )}
            >
              {t("viewMode.month")}
            </button>
          </div>
          {/* Month/Year picker - only show when in month view */}
          {viewMode === "month" && (
            <MonthYearPicker month={month} year={year} onChange={handleMonthYearChange} />
          )}
        </div>
      </div>

      {loading && <LoadingSkeleton className="h-48 sm:h-64 md:h-72 w-full" />}

      {hasError && (
        <p className="text-sm text-red-400">Failed to load scans trend. Please refresh.</p>
      )}

      {!!chartData.length && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="h-48 sm:h-64 md:h-72 w-full"
        >
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <defs>
                <linearGradient id="scanGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#FFD700" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="#FFD700" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="#ffffff10" vertical={false} />
              <XAxis dataKey="date" stroke="#ffffff65" tickLine={false} axisLine={false} />
              <YAxis stroke="#ffffff65" tickLine={false} axisLine={false} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#050505",
                  borderRadius: "12px",
                  border: "1px solid #ffffff20",
                }}
                labelStyle={{ color: "#fff" }}
                itemStyle={{ color: "#FFD700" }}
                formatter={(value: any, name: string, props: any) => {
                  if (
                    props.payload.page1Count !== undefined &&
                    props.payload.page2Count !== undefined
                  ) {
                    return [
                      `${value} total (${props.payload.page1Count} Page 1 + ${props.payload.page2Count} Page 2)`,
                      "Scans",
                    ];
                  }
                  return [value, "Scans"];
                }}
              />
              <Line
                type="monotone"
                dataKey="count"
                stroke="#FFD700"
                strokeWidth={3}
                dot={{ stroke: "#FFD700", strokeWidth: 2, fill: "#050505" }}
                activeDot={{ r: 8 }}
                fill="url(#scanGradient)"
              />
            </LineChart>
          </ResponsiveContainer>
        </motion.div>
      )}
    </AnimatedCard>
  );
}
