import Link from "next/link";
import { QrPreviewGrid } from "@/components/admin/QrPreviewGrid";

// Force dynamic rendering to prevent build-time database queries
export const dynamic = "force-dynamic";

export default function QRPreviewPage() {
  return (
    <div className="h-[calc(100vh-8rem)] overflow-y-auto pr-2 scrollbar-admin space-y-4">
      {/* Page switcher */}
      <div className="flex items-center justify-end pt-2 pr-1 gap-2">
        <Link
          href="/admin/qr-preview"
          className="rounded-full border border-white px-3 py-1.5 text-xs text-black bg-white"
        >
          Page 1
        </Link>
        <Link
          href="/admin/qr-preview/page2"
          className="rounded-full border border-white/20 px-3 py-1.5 text-xs text-white/70 hover:border-white/60"
        >
          Page 2
        </Link>
      </div>
      <QrPreviewGrid />
    </div>
  );
}

