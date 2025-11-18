"use client";

import useSWR from "swr";
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from "recharts";
import { AnimatedCard } from "./AnimatedCard";
import { fetcher } from "@/lib/fetcher";
import { LoadingSkeleton } from "./LoadingSkeleton";
import { motion } from "framer-motion";

type DistributionResponse = {
  distribution: { label: string; value: number }[];
};

// Enhanced color palette with gradients
const COLORS = [
  "#FFD700", // Gold
  "#FFA500", // Orange
  "#C0C0C0", // Silver
  "#8A8A8A", // Gray
  "#FFB347", // Light Orange
  "#E5C100", // Yellow Gold
  "#D4AF37", // Metallic Gold
  "#B8860B", // Dark Goldenrod
];

// Custom tooltip component
const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0];
    const total = payload.reduce((sum: number, item: any) => sum + item.value, 0);
    const percentage = ((data.value / total) * 100).toFixed(1);

    return (
      <div className="bg-black/95 backdrop-blur-xl border border-white/20 rounded-xl p-3 shadow-2xl">
        <p className="text-white font-semibold mb-1">{data.name}</p>
        <p className="text-[#FFD700] text-lg font-bold">{data.value} scans</p>
        <p className="text-white/60 text-xs mt-1">{percentage}% of total</p>
      </div>
    );
  }
  return null;
};

export function DonutChartDistribution() {
  const { data, error, isLoading } = useSWR<DistributionResponse>(
    "/api/admin/scans/top-products?view=distribution",
    fetcher,
    { refreshInterval: 120000 }
  );

  const chartData = data?.distribution ?? [];
  const loading = isLoading;
  const hasError = error;
  const totalScans = chartData.reduce((sum, item) => sum + item.value, 0);

  return (
    <AnimatedCard>
      <div className="mb-6">
        <p className="text-xs uppercase tracking-[0.35em] text-white/50">Global footprint</p>
        <h3 className="mt-2 text-2xl font-semibold text-white">Scan distribution</h3>
      </div>

      {loading && <LoadingSkeleton className="h-64 w-full" />}

      {hasError && (
        <div className="flex items-center justify-center h-64 rounded-xl border border-red-500/20 bg-red-500/5">
          <p className="text-sm text-red-400">Unable to load scan distribution.</p>
        </div>
      )}

      {!loading && !hasError && !chartData.length && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4 }}
          className="flex flex-col items-center justify-center h-64 rounded-xl border border-white/10 bg-white/5"
        >
          <div className="w-20 h-20 rounded-full border-2 border-dashed border-white/20 flex items-center justify-center mb-4">
            <svg
              className="w-10 h-10 text-white/30"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
              />
            </svg>
          </div>
          <p className="text-white/60 text-sm font-medium">No scan data available</p>
          <p className="text-white/40 text-xs mt-1">Scans will appear here once products are verified</p>
        </motion.div>
      )}

      {!!chartData.length && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="space-y-4"
        >
          {/* Chart Container */}
          <div className="h-64 w-full relative">
            <ResponsiveContainer>
              <PieChart>
                <defs>
                  {/* Gradient definitions for better visual appeal */}
                  <linearGradient id="goldGradient" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="#FFD700" stopOpacity={1} />
                    <stop offset="100%" stopColor="#E5C100" stopOpacity={1} />
                  </linearGradient>
                  <linearGradient id="orangeGradient" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="#FFA500" stopOpacity={1} />
                    <stop offset="100%" stopColor="#FF8C00" stopOpacity={1} />
                  </linearGradient>
                  <linearGradient id="silverGradient" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="#C0C0C0" stopOpacity={1} />
                    <stop offset="100%" stopColor="#A8A8A8" stopOpacity={1} />
                  </linearGradient>
                </defs>
                <Pie
                  data={chartData}
                  dataKey="value"
                  nameKey="label"
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={3}
                  startAngle={90}
                  endAngle={-270}
                  animationBegin={0}
                  animationDuration={800}
                  animationEasing="ease-out"
                >
                  {chartData.map((entry, index) => {
                    // Use gradient for first few items, solid colors for rest
                    let fillColor = COLORS[index % COLORS.length];
                    if (index === 0) fillColor = "url(#goldGradient)";
                    else if (index === 1) fillColor = "url(#orangeGradient)";
                    else if (index === 2) fillColor = "url(#silverGradient)";

                    return (
                      <Cell
                        key={`cell-${index}`}
                        fill={fillColor}
                        stroke="#000000"
                        strokeWidth={2}
                        style={{
                          filter: "drop-shadow(0 4px 8px rgba(0, 0, 0, 0.3))",
                        }}
                      />
                    );
                  })}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>

            {/* Center Label - Total Scans */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="text-center">
                <motion.p
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.3, type: "spring", stiffness: 200 }}
                  className="text-[#FFD700] text-3xl font-bold font-sans"
                >
                  {totalScans}
                </motion.p>
                <p className="text-white/50 text-xs uppercase tracking-wider mt-1">Total Scans</p>
              </div>
            </div>
          </div>

          {/* Custom Legend */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2">
            {chartData.map((entry, index) => {
              const percentage = ((entry.value / totalScans) * 100).toFixed(1);
              let fillColor = COLORS[index % COLORS.length];
              if (index === 0) fillColor = "#FFD700";
              else if (index === 1) fillColor = "#FFA500";
              else if (index === 2) fillColor = "#C0C0C0";

              return (
                <motion.div
                  key={entry.label}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.4 + index * 0.1 }}
                  className="flex items-center gap-2 p-2 rounded-lg hover:bg-white/5 transition-colors"
                >
                  <div
                    className="w-3 h-3 rounded-full flex-shrink-0"
                    style={{ backgroundColor: fillColor }}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-medium truncate">{entry.label}</p>
                    <p className="text-white/50 text-xs">
                      {entry.value} scans · {percentage}%
                    </p>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </motion.div>
      )}
    </AnimatedCard>
  );
}


