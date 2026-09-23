"use client";

import useSWR from "swr";
import { useTranslations } from "next-intl";
import { Shield, QrCode, Activity, Zap } from "lucide-react";
import { DashboardCard } from "./DashboardCard";
import { LoadingSkeleton } from "./LoadingSkeleton";
import { fetcher } from "@/lib/fetcher";
import { nextScanPeriod, type ScanPeriodMode } from "./scan-dashboard-types";

type StatsResponse = {
  totalProducts: number;
  totalQrCodes: number;
  totalScans: number;
  scansToday: number;
  scansLast7Days?: number;
  scansLast30Days?: number;
  gramBatches?: number;
  gramItems?: number;
  gramTotalScans?: number;
  gramScansToday?: number;
  gramScansLast7Days?: number;
  gramScansLast30Days?: number;
  combinedTotalProducts?: number;
  combinedTotalQrCodes?: number;
  combinedTotalScans?: number;
  combinedScansToday?: number;
  combinedScansLast7Days?: number;
  combinedScansLast30Days?: number;
};

const icons = {
  products: <Shield className="h-5 w-5" />,
  qr: <QrCode className="h-5 w-5" />,
  scans: <Activity className="h-5 w-5" />,
  today: <Zap className="h-5 w-5" />,
};

type DashboardMetricsProps = {
  scanPeriod: ScanPeriodMode;
  onScanPeriodChange: (period: ScanPeriodMode) => void;
};

const scanPeriodSubtitle: Record<ScanPeriodMode, string> = {
  today: "liveInteractions",
  "7d": "rollingSevenDays",
  "30d": "rollingThirtyDays",
};

export function DashboardMetrics({ scanPeriod, onScanPeriodChange }: DashboardMetricsProps) {
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

  const displayProducts = stats.combinedTotalProducts ?? stats.totalProducts;
  const displayQrCodes = stats.combinedTotalQrCodes ?? stats.totalQrCodes;
  const displayScans = stats.combinedTotalScans ?? stats.totalScans;

  const scanCardByPeriod = {
    today: {
      title: t("scansToday"),
      value: stats.combinedScansToday ?? stats.scansToday,
    },
    "7d": {
      title: t("scansLast7Days"),
      value: stats.combinedScansLast7Days ?? stats.scansLast7Days ?? 0,
    },
    "30d": {
      title: t("scansLast30Days"),
      value: stats.combinedScansLast30Days ?? stats.scansLast30Days ?? 0,
    },
  } as const;

  const scanCard = scanCardByPeriod[scanPeriod];

  return (
    <div className="grid gap-3 sm:gap-4 md:gap-6 grid-cols-1 sm:grid-cols-2 xl:grid-cols-4">
      <DashboardCard
        title={t("totalProducts")}
        value={displayProducts.toLocaleString()}
        delta={t("curatedBars")}
        icon={icons.products}
        accent="gold"
        delay={0.05}
      />
      <DashboardCard
        title={t("totalQrCodes")}
        value={displayQrCodes.toLocaleString()}
        delta={t("mirroredSecure")}
        icon={icons.qr}
        accent="silver"
        delay={0.1}
      />
      <DashboardCard
        title={t("totalScans")}
        value={displayScans.toLocaleString()}
        delta={t("lifetimeVerifications")}
        icon={icons.scans}
        accent="emerald"
        delay={0.15}
      />
      <DashboardCard
        title={scanCard.title}
        value={scanCard.value.toLocaleString()}
        delta={t(scanPeriodSubtitle[scanPeriod])}
        icon={icons.today}
        accent="blue"
        delay={0.2}
        onClick={() => onScanPeriodChange(nextScanPeriod(scanPeriod))}
        hint={t("scanPeriodHint")}
      />
    </div>
  );
}
