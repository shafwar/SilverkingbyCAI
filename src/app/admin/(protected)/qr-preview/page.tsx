import { QrPreviewGrid } from "@/components/admin/QrPreviewGrid";
import { QrPreviewLayout } from "@/components/admin/QrPreviewLayout";

export const dynamic = "force-dynamic";

export default function QRPreviewPage() {
  return (
    <QrPreviewLayout>
      <div className="space-y-4 sm:space-y-5">
        <QrPreviewGrid />
      </div>
    </QrPreviewLayout>
  );
}
