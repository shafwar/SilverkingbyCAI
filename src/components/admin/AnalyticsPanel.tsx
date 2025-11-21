"use client";

import { useMemo, useState } from "react";
import useSWR from "swr";
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
    { key: "name", header: "Product", sortable: true },
    { key: "scans", header: "Scans", sortable: true },
    { key: "share", header: "Share", sortable: true },
  ];

  const tableData =
    topData?.products.map((product) => {
      const total = topData.products.reduce((acc, curr) => acc + curr.scans, 0) || 1;
      const share = `${((product.scans / total) * 100).toFixed(1)}%`;
      return { name: product.name, scans: product.scans, share };
    }) ?? [];

  return (
    <div className="space-y-6">
      <AnimatedCard>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.35em] text-white/50">Signal control</p>
            <h3 className="mt-2 text-2xl font-semibold text-white">Scans over time</h3>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <MonthYearPicker month={month} year={year} onChange={handleMonthYearChange} />
            <button
              onClick={() => window.open("/api/export/excel", "_blank")}
              className="inline-flex items-center gap-2 rounded-full border border-[#FFD700]/40 px-4 py-2 text-sm text-white transition hover:border-[#FFD700]"
            >
              <Download className="h-4 w-4" />
              Export CSV
            </button>
          </div>
        </div>
        <div className="mt-6 h-80">
          {trendLoadingState && <LoadingSkeleton className="h-full w-full" />}
          {!!trendSeries.length && (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendSeries}>
                <CartesianGrid stroke="#ffffff10" vertical={false} />
                <XAxis dataKey="date" stroke="#ffffff60" />
                <YAxis stroke="#ffffff60" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#050505",
                    borderRadius: "12px",
                    border: "1px solid #ffffff20",
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="count"
                  stroke="#FFD700"
                  strokeWidth={3}
                  dot={false}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </AnimatedCard>

      <div className="grid gap-6 lg:grid-cols-5">
        <AnimatedCard className="lg:col-span-3">
          <div className="mb-4">
            <p className="text-xs uppercase tracking-[0.35em] text-white/50">Aggregated metrics</p>
            <h3 className="mt-2 text-2xl font-semibold text-white">Top performing SK bars</h3>
          </div>
          <DataTable columns={columns} data={tableData} isLoading={topLoadingState} />
        </AnimatedCard>

        <AnimatedCard className="lg:col-span-2">
          <div className="mb-4">
            <p className="text-xs uppercase tracking-[0.35em] text-white/50">Hourly heatmap</p>
            <h3 className="mt-2 text-2xl font-semibold text-white">Activity intensity</h3>
          </div>
          <div className="grid grid-cols-6 gap-2">
            {heatmap.map((item) => (
              <motion.div
                key={item.hour}
                className="flex h-16 flex-col items-center justify-center rounded-2xl border border-white/5 text-xs text-white/60"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: item.hour * 0.01 }}
                style={{
                  background: `linear-gradient(180deg, rgba(255,215,0,${item.intensity}) 0%, rgba(0,0,0,0.4) 100%)`,
                }}
              >
                <span className="font-semibold text-white">{item.count}</span>
                <span>{item.hour}:00</span>
              </motion.div>
            ))}
          </div>
        </AnimatedCard>
      </div>
    </div>
  );
}


