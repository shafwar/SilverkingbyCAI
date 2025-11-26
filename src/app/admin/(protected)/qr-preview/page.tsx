import { QrPreviewGrid } from "@/components/admin/QrPreviewGrid";

// Force dynamic rendering to prevent build-time database queries
export const dynamic = "force-dynamic";

export default function QRPreviewPage() {
  return (
    <div className="h-[calc(100vh-8rem)] overflow-y-auto pr-2 scrollbar-admin">
      <QrPreviewGrid />
    </div>
  );
}

