import Link from "next/link";
import { QrPreviewGrid } from "@/components/admin/QrPreviewGrid";

// Force dynamic rendering to prevent build-time database queries
export const dynamic = "force-dynamic";

export default function QRPreviewPage() {
  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col overflow-hidden">
      {/* Switcher stays visible (no scrolling away) */}
      <div className="flex items-center justify-center gap-3 sm:gap-4 flex-wrap px-1 sm:px-2 pt-3 pb-2 border-b border-white/5 bg-black/30 backdrop-blur">
        <Link
          href="/admin/qr-preview"
          className="rounded-full border-2 border-white px-5 py-2.5 sm:px-6 sm:py-3 text-sm sm:text-base font-semibold text-black bg-white touch-manipulation shadow-lg hover:shadow-[#FFD700]/30 transition-shadow"
        >
          Page 1
        </Link>
        <Link
          href="/admin/qr-preview/page2"
          className="rounded-full border-2 border-white/40 px-5 py-2.5 sm:px-6 sm:py-3 text-sm sm:text-base font-semibold text-white/90 hover:border-white/80 hover:bg-white/10 touch-manipulation transition-all"
        >
          Page 2
        </Link>
        <Link
          href="/admin/qr-preview/serticard"
          className="rounded-full border-2 border-white/40 px-5 py-2.5 sm:px-6 sm:py-3 text-sm sm:text-base font-semibold text-white/90 hover:border-white/80 hover:bg-white/10 touch-manipulation transition-all"
        >
          Serticard
        </Link>
      </div>

      {/* Single scroll container (prevents double-scroll) */}
      <div className="flex-1 min-h-0 overflow-y-auto scrollbar-admin pr-1 sm:pr-2">
        <div className="pt-3 space-y-3 sm:space-y-4">
          <QrPreviewGrid />
        </div>
      </div>
    </div>
  );
}
