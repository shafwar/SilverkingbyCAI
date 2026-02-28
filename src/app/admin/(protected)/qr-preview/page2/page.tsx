import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { QrPreviewGridGram } from "@/components/admin/QrPreviewGridGram";

export const dynamic = "force-dynamic";

export default async function QrPreviewPage2() {
  // Get all items grouped by batch
  const items = await prisma.gramProductItem.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      batch: true,
    },
  });

  // Group items by batchId to show batches instead of individual items
  const batchesMap = new Map<
    number,
    {
      batchId: number;
      batchName: string;
      batchWeight: number;
      batchWeightGroup: string | null;
      items: Array<{
        id: number;
        uniqCode: string;
        serialCode: string;
        qrImageUrl: string;
        hasRootKey: boolean;
        rootKey: string | null;
      }>;
    }
  >();

  items.forEach((item) => {
    if (!batchesMap.has(item.batchId)) {
      batchesMap.set(item.batchId, {
        batchId: item.batchId,
        batchName: item.batch.name,
        batchWeight: item.batch.weight,
        batchWeightGroup: item.batch.weightGroup,
        items: [],
      });
    }
    batchesMap.get(item.batchId)!.items.push({
      id: item.id,
      uniqCode: item.uniqCode,
      serialCode: item.serialCode,
      qrImageUrl: item.qrImageUrl,
      hasRootKey: !!item.rootKeyHash,
      rootKey: item.rootKey ?? null,
    });
  });

  // Convert to array and sort by batchId (newest first)
  const batches = Array.from(batchesMap.values()).sort((a, b) => b.batchId - a.batchId);

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col overflow-hidden">
      {/* Switcher stays visible (no scrolling away) */}
      <div className="flex items-center justify-center gap-3 sm:gap-4 flex-wrap px-1 sm:px-2 pt-3 pb-2 border-b border-white/5 bg-black/30 backdrop-blur">
        <Link
          href="/admin/qr-preview"
          className="rounded-full border-2 border-white/40 px-5 py-2.5 sm:px-6 sm:py-3 text-sm sm:text-base font-semibold text-white/90 hover:border-white/80 hover:bg-white/10 touch-manipulation transition-all"
        >
          Page 1
        </Link>
        <Link
          href="/admin/qr-preview/page2"
          className="rounded-full border-2 border-white px-5 py-2.5 sm:px-6 sm:py-3 text-sm sm:text-base font-semibold text-black bg-white touch-manipulation shadow-lg hover:shadow-[#FFD700]/30 transition-shadow"
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
          <QrPreviewGridGram
            batches={batches.map((batch) => ({
              batchId: batch.batchId,
              name: batch.batchName,
              weight: batch.batchWeight,
              weightGroup: batch.batchWeightGroup,
              itemCount: batch.items.length,
              // Use first item for display (all items in batch have same name/weight)
              firstItem: batch.items[0],
              allItems: batch.items,
            }))}
          />
        </div>
      </div>
    </div>
  );
}
