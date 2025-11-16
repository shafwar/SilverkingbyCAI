import { StatsHeader } from "@/components/admin/StatsHeader";
import { QrPreviewGrid } from "@/components/admin/QrPreviewGrid";

export default function QRPreviewPage() {
  return (
    <div className="space-y-8">
      <StatsHeader
        eyebrow="QR vault"
        title="Visualize every serialized artifact"
        description="Each QR asset is rendered in high-fidelity and mirrored locally for zero-latency scans. Tap an item to inspect it in detail."
      />
      <QrPreviewGrid />
    </div>
  );
}

