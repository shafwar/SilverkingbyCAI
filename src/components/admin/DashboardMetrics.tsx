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
};

const icons = {
  products: <Shield className="h-5 w-5" />,
  qr: <QrCode className="h-5 w-5" />,
  scans: <Activity className="h-5 w-5" />,
  today: <Zap className="h-5 w-5" />,
};

export function DashboardMetrics() {
  const t = useTranslations('admin.metrics');
  const { data, error, isLoading } = useSWR<StatsResponse>(
    "/api/admin/stats",
    fetcher,
    { refreshInterval: 45000 }
  );

  const stats = data;
  const loading = isLoading;
  const hasError = error;

  if (loading) {
    return <LoadingSkeleton className="h-32 w-full" />;
  }

  if (hasError || !stats) {
    return <p className="text-sm text-red-400">{t('unableToLoad')}</p>;
  }

  return (
    <div className="grid gap-3 sm:gap-4 md:gap-6 grid-cols-1 sm:grid-cols-2 xl:grid-cols-4">
      <DashboardCard
        title={t('totalProducts')}
        value={stats.totalProducts.toLocaleString()}
        delta={t('curatedBars')}
        icon={icons.products}
        accent="gold"
        delay={0.05}
      />
      <DashboardCard
        title={t('totalQrCodes')}
        value={stats.totalQrCodes.toLocaleString()}
        delta={t('mirroredSecure')}
        icon={icons.qr}
        accent="silver"
        delay={0.1}
      />
      <DashboardCard
        title={t('totalScans')}
        value={stats.totalScans.toLocaleString()}
        delta={t('lifetimeVerifications')}
        icon={icons.scans}
        accent="emerald"
        delay={0.15}
      />
      <DashboardCard
        title={t('scansToday')}
        value={stats.scansToday.toLocaleString()}
        delta={t('liveInteractions')}
        icon={icons.today}
        accent="blue"
        delay={0.2}
      />
    </div>
  );
}


