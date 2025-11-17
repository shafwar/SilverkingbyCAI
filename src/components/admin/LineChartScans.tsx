"use client";

import { useState } from "react";
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

type TrendResponse = {
  range: number;
  data: { date: string; count: number }[];
};

const ranges: TrendResponse["range"][] = [7, 30];

export function LineChartScans() {
  const [range, setRange] = useState<TrendResponse["range"]>(7);
  const { data, error, isLoading, mutate } = useSWR<TrendResponse>(
    `/api/admin/scans/trend?range=${range}`,
    fetcher,
    { refreshInterval: 60000, revalidateOnFocus: false }
  );

  const handleRangeChange = (value: TrendResponse["range"]) => {
    setRange(value);
    mutate();
  };

  const chartData = data?.data ?? [];
  const loading = isLoading;
  const hasError = error;

  return (
    <AnimatedCard>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.35em] text-white/50">Verification Volume</p>
          <h3 className="mt-2 text-2xl font-semibold text-white">Scan trajectory</h3>
        </div>
        <div className="flex gap-2">
          {ranges.map((item) => (
            <button
              key={item}
              onClick={() => handleRangeChange(item)}
              className={`rounded-full border px-4 py-1 text-sm transition ${
                range === item
                  ? "border-[#FFD700]/80 bg-[#FFD700]/20 text-white"
                  : "border-white/10 text-white/60 hover:border-white/30"
              }`}
            >
              Last {item} days
            </button>
          ))}
        </div>
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


