import { StatsHeader } from "@/components/admin/StatsHeader";
import { DashboardMetrics } from "@/components/admin/DashboardMetrics";
import { LineChartScans } from "@/components/admin/LineChartScans";
import { RecentActivity } from "@/components/admin/RecentActivity";
import { BarChartTopProducts } from "@/components/admin/BarChartTopProducts";
import { DonutChartDistribution } from "@/components/admin/DonutChartDistribution";

export default function AdminDashboard() {
  return (
    <div className="space-y-10">
      <StatsHeader
        eyebrow="Silver King Command"
        title="Luxury anti-counterfeit intelligence"
        description="Monitor authenticated supply chains with real-time scan telemetry, product health, and risk posture. Every widget below talks directly to the verification engine."
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
