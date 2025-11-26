import { StatsHeader } from "@/components/admin/StatsHeader";
import { AnalyticsPanel } from "@/components/admin/AnalyticsPanel";

export default function AnalyticsPage() {
  return (
    <div className="space-y-4 sm:space-y-6 md:space-y-8">
      <StatsHeader
        eyebrow="Advanced telemetry"
        title="Deep analytics & exportable intelligence"
        description="Slice high-volume verification data by timeframe, observe hourly intensity, and export curated insights for your compliance and brand teams."
      />
      <AnalyticsPanel />
    </div>
  );
}


