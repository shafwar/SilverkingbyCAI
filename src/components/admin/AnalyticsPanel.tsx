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
} from "recharts";
import { motion } from "framer-motion";
import { Download } from "lucide-react";

import { fetcher } from "@/lib/fetcher";
import { MonthYearPicker } from "./MonthYearPicker";
import { AnimatedCard } from "./AnimatedCard";
import { LoadingSkeleton } from "./LoadingSkeleton";
import { DataTable, TableColumn } from "./DataTable";

type TrendResponse = {
  data: { date: string; count: number }[];
  month?: number | null;
  year?: number | null;
};

type TopProductsResponse = {
  products: { name: string; scans: number }[];
};

type LogsResponse = {
  logs: { scannedAt: string }[];
};

export function AnalyticsPanel() {
  const t = useTranslations('admin.analytics');
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1); // 1-indexed
  const [year, setYear] = useState(now.getFullYear());

  // Check if viewing current month - only real-time updates for current month
  const isCurrentMonth = useMemo(() => {
    const currentDate = new Date();
    return year === currentDate.getFullYear() && month === currentDate.getMonth() + 1;
  }, [month, year]);

  const { data: trend, isLoading: trendLoading, mutate: mutateTrend } = useSWR<TrendResponse>(
    `/api/admin/scans/trend?month=${month}&year=${year}`,
    fetcher,
    {
      // Only refresh in real-time for current month (every 30 seconds)
      // History months don't need real-time updates
      refreshInterval: isCurrentMonth ? 30000 : 0,
      revalidateOnFocus: isCurrentMonth, // Revalidate on focus only for current month
      revalidateOnReconnect: true, // Always revalidate when connection is restored
      dedupingInterval: 5000, // Dedupe requests within 5 seconds
    }
  );

  const handleMonthYearChange = (newMonth: number, newYear: number) => {
    setMonth(newMonth);
    setYear(newYear);
    // Immediately fetch new data when month changes
    mutateTrend();
  };

  const { data: top, isLoading: topLoading } = useSWR<TopProductsResponse>(
    "/api/admin/scans/top-products",
    fetcher,
    {
      refreshInterval: 60000, // Refresh every minute for top products
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
      dedupingInterval: 5000,
    }
  );

  const { data: logs } = useSWR<LogsResponse>("/api/admin/logs?limit=200", fetcher, {
    refreshInterval: 30000, // Refresh every 30 seconds for logs (real-time activity)
    revalidateOnFocus: true,
    revalidateOnReconnect: true,
    dedupingInterval: 5000,
  });

  const trendSeries = trend?.data ?? [];
  const trendLoadingState = trendLoading;
  const topData = top;
  const topLoadingState = topLoading;
  const logsData = logs;

  const heatmap = useMemo(() => {
    const hours = Array.from({ length: 24 }).map((_, index) => ({
      hour: index,
      count: 0,
    }));
    logsData?.logs.forEach((log) => {
      const hour = new Date(log.scannedAt).getHours();
      hours[hour].count += 1;
    });
    const max = Math.max(...hours.map((h) => h.count), 1);
    return hours.map((item) => ({
      ...item,
      intensity: item.count / max,
    }));
  }, [logsData]);

  const columns: TableColumn<{ name: string; scans: number; share: string }>[] = [
    { key: "name", header: t('product'), sortable: true },
    { key: "scans", header: t('scans'), sortable: true },
    { key: "share", header: t('share'), sortable: true },
  ];

  const tableData =
    topData?.products.map((product) => {
      const total = topData.products.reduce((acc, curr) => acc + curr.scans, 0) || 1;
      const share = `${((product.scans / total) * 100).toFixed(1)}%`;
      return { name: product.name, scans: product.scans, share };
    }) ?? [];

  return (
    <div className="space-y-4 sm:space-y-5 md:space-y-6">
      <AnimatedCard>
        <div className="flex flex-col gap-3 sm:gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex-1 min-w-0">
            <p className="text-[10px] sm:text-xs uppercase tracking-[0.3em] sm:tracking-[0.35em] text-white/50">{t('signalControl')}</p>
            <h3 className="mt-1.5 sm:mt-2 text-lg sm:text-xl md:text-2xl font-semibold text-white leading-tight">{t('scansOverTime')}</h3>
          </div>
          <div className="flex flex-wrap items-center gap-2 sm:gap-3 flex-shrink-0">
            <MonthYearPicker month={month} year={year} onChange={handleMonthYearChange} />
            <button
              onClick={() => window.open("/api/export/excel", "_blank")}
              className="inline-flex items-center gap-1.5 sm:gap-2 rounded-full border border-[#FFD700]/40 px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm text-white transition hover:border-[#FFD700]"
            >
              <Download className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">{t('exportCSV')}</span>
              <span className="sm:hidden">{t('export')}</span>
            </button>
          </div>
        </div>
        <div className="mt-4 sm:mt-5 md:mt-6 h-64 sm:h-72 md:h-80">
          {trendLoadingState && <LoadingSkeleton className="h-full w-full" />}
          {!!trendSeries.length && (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendSeries} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                <CartesianGrid stroke="#ffffff10" vertical={false} />
                <XAxis 
                  dataKey="date" 
                  stroke="#ffffff60" 
                  tick={{ fontSize: 11 }}
                  interval="preserveStartEnd"
                />
                <YAxis 
                  stroke="#ffffff60" 
                  tick={{ fontSize: 11 }}
                  width={40}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#050505",
                    borderRadius: "12px",
                    border: "1px solid #ffffff20",
                    fontSize: "12px",
                    padding: "8px 12px",
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="count"
                  stroke="#FFD700"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </AnimatedCard>

      <div className="grid gap-4 sm:gap-5 md:gap-6 lg:grid-cols-5">
        <AnimatedCard className="lg:col-span-3">
          <div className="mb-3 sm:mb-4">
            <p className="text-[10px] sm:text-xs uppercase tracking-[0.3em] sm:tracking-[0.35em] text-white/50">{t('aggregatedMetrics')}</p>
            <h3 className="mt-1.5 sm:mt-2 text-lg sm:text-xl md:text-2xl font-semibold text-white leading-tight">{t('topPerforming')}</h3>
          </div>
          <DataTable columns={columns} data={tableData} isLoading={topLoadingState} />
        </AnimatedCard>

        <AnimatedCard className="lg:col-span-2">
          <div className="mb-3 sm:mb-4">
            <p className="text-[10px] sm:text-xs uppercase tracking-[0.3em] sm:tracking-[0.35em] text-white/50">{t('hourlyHeatmap')}</p>
            <h3 className="mt-1.5 sm:mt-2 text-lg sm:text-xl md:text-2xl font-semibold text-white leading-tight">{t('activityIntensity')}</h3>
          </div>
          <div className="grid grid-cols-4 sm:grid-cols-6 gap-1.5 sm:gap-2">
            {heatmap.map((item) => (
              <motion.div
                key={item.hour}
                className="flex h-12 sm:h-14 md:h-16 flex-col items-center justify-center rounded-xl sm:rounded-2xl border border-white/5 text-[10px] sm:text-xs text-white/60"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: item.hour * 0.01 }}
                style={{
                  background: `linear-gradient(180deg, rgba(255,215,0,${item.intensity}) 0%, rgba(0,0,0,0.4) 100%)`,
                }}
              >
                <span className="font-semibold text-white text-xs sm:text-sm">{item.count}</span>
                <span className="text-[9px] sm:text-xs">{item.hour}:00</span>
              </motion.div>
            ))}
          </div>
        </AnimatedCard>
      </div>
    </div>
  );
}


