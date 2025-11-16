"use client";

import useSWR from "swr";
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from "recharts";
import { AnimatedCard } from "./AnimatedCard";
import { fetcher } from "@/lib/fetcher";
import { LoadingSkeleton } from "./LoadingSkeleton";
import { DASHBOARD_USE_MOCKS, mockDistribution } from "@/lib/dashboard-mocks";

type DistributionResponse = {
  distribution: { label: string; value: number }[];
};

const COLORS = ["#FFD700", "#E5C100", "#C0C0C0", "#8A8A8A", "#FFB347"];

export function DonutChartDistribution() {
  const useMocks = DASHBOARD_USE_MOCKS;
  const { data, error, isLoading } = useSWR<DistributionResponse>(
    useMocks ? null : "/api/admin/scans/top-products?view=distribution",
    fetcher,
    { refreshInterval: 120000 }
  );

  const chartData = useMocks ? mockDistribution : data?.distribution ?? [];
  const loading = useMocks ? false : isLoading;
  const hasError = useMocks ? false : error;

  return (
    <AnimatedCard>
      <div className="mb-6">
        <p className="text-xs uppercase tracking-[0.35em] text-white/50">Global footprint</p>
        <h3 className="mt-2 text-2xl font-semibold text-white">Scan distribution</h3>
      </div>

      {loading && <LoadingSkeleton className="h-64 w-full" />}

      {hasError && (
        <p className="text-sm text-red-400">Unable to load scan distribution.</p>
      )}

      {!!chartData.length && (
        <div className="h-64 w-full">
          <ResponsiveContainer>
            <PieChart>
              <Pie
                data={chartData}
                dataKey="value"
                nameKey="label"
                innerRadius={70}
                outerRadius={110}
                paddingAngle={4}
                startAngle={90}
                endAngle={-270}
              >
                {chartData.map((entry, index) => (
                  <Cell key={entry.label} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: "#050505",
                  borderRadius: "12px",
                  border: "1px solid #ffffff20",
                  color: "#fff",
                }}
              />
              <Legend
                wrapperStyle={{
                  color: "#fff",
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      )}
    </AnimatedCard>
  );
}


