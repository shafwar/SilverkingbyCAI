"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import useSWR from "swr";
import { GramProductTable } from "@/components/admin/GramProductTable";
import { fetcher } from "@/lib/fetcher";
import { LoadingSkeleton } from "@/components/admin/LoadingSkeleton";

type GramBatchRow = {
  id: number;
  name: string;
  weight: number;
  quantity: number;
  qrMode: string;
  weightGroup: string | null;
  createdAt: string;
  qrCount: number;
  totalScanCount?: number;
};

type BatchesResponse = {
  batches: GramBatchRow[];
};

export function GramProductsPageClient({ batches: initialBatches }: { batches: GramBatchRow[] }) {
  const t = useTranslations("admin.productsDetail");

  // Fetch real-time data with SWR
  const { data, error, isLoading, mutate } = useSWR<BatchesResponse>(
    "/api/gram-products/list",
    fetcher,
    {
      refreshInterval: 30000, // Refresh every 30 seconds for real-time updates
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
      fallbackData: { batches: initialBatches }, // Use initial server data as fallback
    }
  );

  const batches = data?.batches ?? initialBatches;

  return (
    <div className="space-y-4 sm:space-y-6 h-[calc(100vh-8rem)] flex flex-col">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-0 flex-shrink-0">
        <div>
          <p className="text-[10px] sm:text-xs uppercase tracking-[0.4em] sm:tracking-[0.5em] text-white/60">
            {t("inventory")} – Page 2
          </p>
          <h1 className="text-xl sm:text-2xl font-semibold text-white">{t("title")} (Gram-based QR)</h1>
        </div>
        <div className="flex items-center gap-2 sm:gap-3 flex-wrap sm:flex-nowrap">
          {/* Page switcher: Page 1 / Page 2 (matching QR Preview style) */}
          <div className="flex rounded-full border border-white/20 bg-white/5 p-0.5 sm:p-1 text-[10px] sm:text-xs">
            <Link
              href="/admin/products"
              className="rounded-full px-2 py-1 sm:px-3 sm:py-1.5 text-[10px] sm:text-xs text-white/70 hover:border-white/60 touch-manipulation"
            >
              Page 1
            </Link>
            <Link
              href="/admin/products/page2"
              className="rounded-full border border-white px-2 py-1 sm:px-3 sm:py-1.5 text-[10px] sm:text-xs text-black bg-white touch-manipulation"
            >
              Page 2
            </Link>
          </div>
          <Link
            href="/admin/products/page2/create"
            className="rounded-full border border-white/15 px-3 py-1.5 sm:px-4 sm:py-2 text-[11px] sm:text-sm text-white hover:border-white/40 touch-manipulation whitespace-nowrap"
          >
            {t("addProduct")}
          </Link>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto pr-2 scrollbar-admin">
        {isLoading && !data ? (
          <LoadingSkeleton className="h-64 w-full" />
        ) : error ? (
          <div className="rounded-3xl border border-red-500/20 bg-red-500/10 p-6 text-center">
            <p className="text-sm text-red-400">Failed to load batches. Please refresh.</p>
            <button
              onClick={() => mutate()}
              className="mt-4 rounded-full border border-white/20 px-4 py-2 text-sm text-white hover:bg-white/10"
            >
              Retry
            </button>
          </div>
        ) : (
          <GramProductTable batches={batches} onMutate={mutate} />
        )}
      </div>
    </div>
  );
}
