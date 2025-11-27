"use client";

import { useTranslations } from "next-intl";
import { StatsHeader } from "@/components/admin/StatsHeader";
import { DashboardMetrics } from "@/components/admin/DashboardMetrics";
import { LineChartScans } from "@/components/admin/LineChartScans";
import { RecentActivity } from "@/components/admin/RecentActivity";
import { BarChartTopProducts } from "@/components/admin/BarChartTopProducts";
import { DonutChartDistribution } from "@/components/admin/DonutChartDistribution";

export default function AdminDashboard() {
  const t = useTranslations('admin');

  return (
    <div className="space-y-10">
      <StatsHeader
        eyebrow={t('command.eyebrow')}
        title={t('command.title')}
        description={t('command.description')}
      />

      <DashboardMetrics />

      <section className="space-y-6">
        <LineChartScans />
        <div className="grid gap-6 lg:grid-cols-2">
          <BarChartTopProducts />
          <DonutChartDistribution />
        </div>
        <RecentActivity compact />
      </section>
    </div>
  );
}
