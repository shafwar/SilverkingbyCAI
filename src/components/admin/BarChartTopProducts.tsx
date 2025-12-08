"use client";

import useSWR from "swr";
import { useTranslations } from "next-intl";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts";
import { AnimatedCard } from "./AnimatedCard";
import { fetcher } from "@/lib/fetcher";
import { LoadingSkeleton } from "./LoadingSkeleton";

type TopProductsResponse = {
  products: { name: string; scans: number; source?: "page1" | "page2" }[];
};

export function BarChartTopProducts() {
  const t = useTranslations("admin.charts");
  const { data, error, isLoading } = useSWR<TopProductsResponse>(
    "/api/admin/scans/top-products",
    fetcher,
    { refreshInterval: 120000 }
  );

  const chartData = data?.products ?? [];
  const loading = isLoading;
  const hasError = error;

  return (
    <AnimatedCard>
      <div className="mb-4 sm:mb-6">
        <p className="text-[10px] sm:text-xs uppercase tracking-[0.3em] sm:tracking-[0.35em] text-white/50">
          {t("mostTrustedPieces")}
        </p>
        <h3 className="mt-1.5 sm:mt-2 text-lg sm:text-xl md:text-2xl font-semibold text-white">
          {t("topScannedProducts")}
        </h3>
      </div>

      {loading && <LoadingSkeleton className="h-48 sm:h-56 md:h-64 w-full" />}

      {hasError && <p className="text-sm text-red-400">{t("unableToLoadTop")}</p>}

      {!!chartData.length && (
        <div className="h-48 sm:h-56 md:h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 0, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
              <XAxis dataKey="name" stroke="#ffffff65" tickLine={false} axisLine={false} />
              <YAxis stroke="#ffffff65" tickLine={false} axisLine={false} />
              <Tooltip
                cursor={{ fill: "#ffffff05" }}
                contentStyle={{
                  backgroundColor: "#050505",
                  borderRadius: "12px",
                  border: "1px solid #ffffff20",
                  color: "#fff",
                }}
              />
              <Bar dataKey="scans" fill="url(#goldGradient)" radius={[12, 12, 4, 4]} barSize={32} />
              <defs>
                <linearGradient id="goldGradient" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor="#FFD700" stopOpacity={0.9} />
                  <stop offset="100%" stopColor="#B8860B" stopOpacity={0.6} />
                </linearGradient>
              </defs>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </AnimatedCard>
  );
}
