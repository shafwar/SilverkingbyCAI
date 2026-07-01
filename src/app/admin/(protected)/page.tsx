"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { AdminPageLayout } from "@/components/admin/AdminPageLayout";
import { DashboardMetrics } from "@/components/admin/DashboardMetrics";
import { LineChartScans } from "@/components/admin/LineChartScans";
import { RecentActivity } from "@/components/admin/RecentActivity";
import { BarChartTopProducts } from "@/components/admin/BarChartTopProducts";
import { DonutChartDistribution } from "@/components/admin/DonutChartDistribution";
import {
  scanPeriodToChartView,
  type ScanPeriodMode,
} from "@/components/admin/scan-dashboard-types";

export default function AdminDashboard() {
  const t = useTranslations("admin");
  const [scanPeriod, setScanPeriod] = useState<ScanPeriodMode>("today");
  const chartViewMode = scanPeriodToChartView(scanPeriod);

  return (
    <AdminPageLayout
      eyebrow={t("command.eyebrow")}
      title={t("command.title")}
      description={t("command.description")}
    >
      <div className="space-y-6 sm:space-y-8 md:space-y-10">
        <DashboardMetrics scanPeriod={scanPeriod} onScanPeriodChange={setScanPeriod} />

        <section className="space-y-4 sm:space-y-5 md:space-y-6">
          <LineChartScans
            viewMode={chartViewMode}
            onViewModeChange={(mode) => setScanPeriod(mode)}
          />
          <div className="grid gap-4 sm:gap-5 md:gap-6 grid-cols-1 lg:grid-cols-2">
            <BarChartTopProducts />
            <DonutChartDistribution />
          </div>
          <RecentActivity compact />
        </section>
      </div>
    </AdminPageLayout>
  );
}
