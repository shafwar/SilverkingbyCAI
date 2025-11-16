import { StatsHeader } from "@/components/admin/StatsHeader";
import { LogsTable } from "@/components/admin/LogsTable";

export default function LogsPage() {
  return (
    <div className="space-y-8">
      <StatsHeader
        eyebrow="Security telemetry"
        title="Full-fidelity verification ledger"
        description="Trace every authentication event with precise metadata, filtering, and exports for compliance reviews."
      />
      <LogsTable />
    </div>
  );
}

