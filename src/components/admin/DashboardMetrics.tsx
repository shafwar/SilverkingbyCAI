"use client";

import useSWR from "swr";
import { Shield, QrCode, Activity, Zap } from "lucide-react";
import { DashboardCard } from "./DashboardCard";
import { LoadingSkeleton } from "./LoadingSkeleton";
import { fetcher } from "@/lib/fetcher";
import { DASHBOARD_USE_MOCKS, mockDashboardStats } from "@/lib/dashboard-mocks";

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
  const useMocks = DASHBOARD_USE_MOCKS;
  const { data, error, isLoading } = useSWR<StatsResponse>(
    useMocks ? null : "/api/admin/stats",
    fetcher,
    { refreshInterval: 45000 }
  );

  const stats = useMocks ? mockDashboardStats : data;
  const loading = useMocks ? false : isLoading;
  const hasError = useMocks ? false : error;

  if (loading) {
    return <LoadingSkeleton className="h-32 w-full" />;
  }

  if (hasError || !stats) {
    return <p className="text-sm text-red-400">Unable to load dashboard metrics.</p>;
  }

  return (
    <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
      <DashboardCard
        title="Total Products"
        value={stats.totalProducts.toLocaleString()}
        delta="+ curated SK bars"
        icon={icons.products}
        accent="gold"
        delay={0.05}
      />
      <DashboardCard
        title="Total QR Codes"
        value={stats.totalQrCodes.toLocaleString()}
        delta="Mirrored & secure"
        icon={icons.qr}
        accent="silver"
        delay={0.1}
      />
      <DashboardCard
        title="Total Scans"
        value={stats.totalScans.toLocaleString()}
        delta="Lifetime verifications"
        icon={icons.scans}
        accent="emerald"
        delay={0.15}
      />
      <DashboardCard
        title="Scans Today"
        value={stats.scansToday.toLocaleString()}
        delta="Live interactions"
        icon={icons.today}
        accent="blue"
        delay={0.2}
      />
    </div>
  );
}


