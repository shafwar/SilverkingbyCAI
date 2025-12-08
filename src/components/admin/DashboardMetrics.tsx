"use client";

import useSWR from "swr";
import { useTranslations } from "next-intl";
import { Shield, QrCode, Activity, Zap } from "lucide-react";
import { DashboardCard } from "./DashboardCard";
import { LoadingSkeleton } from "./LoadingSkeleton";
import { fetcher } from "@/lib/fetcher";

type StatsResponse = {
  totalProducts: number;
  totalQrCodes: number;
  totalScans: number;
  scansToday: number;
  // Page 2 data
  gramBatches?: number;
  gramItems?: number;
  gramTotalScans?: number;
  gramScansToday?: number;
  // Combined totals
  combinedTotalProducts?: number;
  combinedTotalQrCodes?: number;
  combinedTotalScans?: number;
  combinedScansToday?: number;
};

const icons = {
  products: <Shield className="h-5 w-5" />,
  qr: <QrCode className="h-5 w-5" />,
  scans: <Activity className="h-5 w-5" />,
  today: <Zap className="h-5 w-5" />,
};

export function DashboardMetrics() {
  const t = useTranslations("admin.metrics");
  const { data, error, isLoading } = useSWR<StatsResponse>("/api/admin/stats", fetcher, {
    refreshInterval: 45000,
  });

  const stats = data;
  const loading = isLoading;
  const hasError = error;

  if (loading) {
    return <LoadingSkeleton className="h-32 w-full" />;
  }

  if (hasError || !stats) {
    return <p className="text-sm text-red-400">{t("unableToLoad")}</p>;
  }

  // Use combined totals if available, otherwise fallback to page1 only
  const displayProducts = stats.combinedTotalProducts ?? stats.totalProducts;
  const displayQrCodes = stats.combinedTotalQrCodes ?? stats.totalQrCodes;
  const displayScans = stats.combinedTotalScans ?? stats.totalScans;
  const displayScansToday = stats.combinedScansToday ?? stats.scansToday;

  return (
    <div className="grid gap-3 sm:gap-4 md:gap-6 grid-cols-1 sm:grid-cols-2 xl:grid-cols-4">
      <DashboardCard
        title={t("totalProducts")}
        value={displayProducts.toLocaleString()}
        delta={
          stats.gramBatches
            ? `${stats.totalProducts} Page 1 + ${stats.gramBatches} Page 2`
            : t("curatedBars")
        }
        icon={icons.products}
        accent="gold"
        delay={0.05}
      />
      <DashboardCard
        title={t("totalQrCodes")}
        value={displayQrCodes.toLocaleString()}
        delta={
          stats.gramItems
            ? `${stats.totalQrCodes} Page 1 + ${stats.gramItems} Page 2`
            : t("mirroredSecure")
        }
        icon={icons.qr}
        accent="silver"
        delay={0.1}
      />
      <DashboardCard
        title={t("totalScans")}
        value={displayScans.toLocaleString()}
        delta={
          stats.gramTotalScans
            ? `${stats.totalScans} Page 1 + ${stats.gramTotalScans} Page 2`
            : t("lifetimeVerifications")
        }
        icon={icons.scans}
        accent="emerald"
        delay={0.15}
      />
      <DashboardCard
        title={t("scansToday")}
        value={displayScansToday.toLocaleString()}
        delta={
          stats.gramScansToday
            ? `${stats.scansToday} Page 1 + ${stats.gramScansToday} Page 2`
            : t("liveInteractions")
        }
        icon={icons.today}
        accent="blue"
        delay={0.2}
      />
    </div>
  );
}
