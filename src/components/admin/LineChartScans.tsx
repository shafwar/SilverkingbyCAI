"use client";

import { useState, useMemo } from "react";
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

import { fetcher } from "@/lib/fetcher";
import { AnimatedCard } from "./AnimatedCard";
import { LoadingSkeleton } from "./LoadingSkeleton";
import { MonthYearPicker } from "./MonthYearPicker";

type TrendResponse = {
  range: number;
  month?: number | null;
  year?: number | null;
  data: { date: string; count: number }[];
};

export function LineChartScans() {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1); // 1-indexed
  const [year, setYear] = useState(now.getFullYear());

  // Check if viewing current month - only real-time updates for current month
  const isCurrentMonth = useMemo(() => {
    const currentDate = new Date();
    return year === currentDate.getFullYear() && month === currentDate.getMonth() + 1;
  }, [month, year]);

  const { data, error, isLoading, mutate } = useSWR<TrendResponse>(
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
    mutate();
  };

  const chartData = data?.data ?? [];
  const loading = isLoading;
  const hasError = error;

  return (
    <AnimatedCard>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.35em] text-white/50">Verification Volume</p>
          <h3 className="mt-2 text-2xl font-semibold text-white">Scan trajectory</h3>
        </div>
        <MonthYearPicker month={month} year={year} onChange={handleMonthYearChange} />
      </div>

      {loading && <LoadingSkeleton className="h-72 w-full" />}

      {hasError && (
        <p className="text-sm text-red-400">
          Failed to load scans trend. Please refresh.
        </p>
      )}

      {!!chartData.length && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="h-72 w-full"
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


