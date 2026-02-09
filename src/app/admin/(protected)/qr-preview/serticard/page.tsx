import Link from "next/link";
import { SerticardPanel } from "@/components/admin/SerticardPanel";

export const dynamic = "force-dynamic";

export default function SerticardPage() {
  return (
    <div className="h-[calc(100vh-8rem)] overflow-y-scroll scrollbar-admin pr-1 sm:pr-2 space-y-3 sm:space-y-4">
      <div className="flex items-center justify-center pt-3 pb-1 gap-3 sm:gap-4">
        <Link
          href="/admin/qr-preview"
          className="rounded-full border-2 border-white/40 px-5 py-2.5 sm:px-6 sm:py-3 text-sm sm:text-base font-semibold text-white/90 hover:border-white/80 hover:bg-white/10 touch-manipulation transition-all"
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
          className="rounded-full border-2 border-white px-5 py-2.5 sm:px-6 sm:py-3 text-sm sm:text-base font-semibold text-black bg-white touch-manipulation shadow-lg hover:shadow-[#FFD700]/30 transition-shadow"
        >
          Serticard
        </Link>
      </div>
      <SerticardPanel />
    </div>
  );
}
