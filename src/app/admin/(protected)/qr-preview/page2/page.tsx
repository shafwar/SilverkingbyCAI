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
    });
  });

  // Convert to array and sort by batchId (newest first)
  const batches = Array.from(batchesMap.values()).sort((a, b) => b.batchId - a.batchId);

  return (
    <div className="h-[calc(100vh-8rem)] pr-1 sm:pr-2 space-y-3 sm:space-y-4 scrollbar-admin overflow-y-scroll">
      {/* Page switcher */}
      <div className="flex items-center justify-end pt-2 pr-1 gap-1.5 sm:gap-2">
        <Link
          href="/admin/qr-preview"
          className="rounded-full border border-white/20 px-2 py-1 sm:px-3 sm:py-1.5 text-[10px] sm:text-xs text-white/70 hover:border-white/60 touch-manipulation"
        >
          Page 1
        </Link>
        <Link
          href="/admin/qr-preview/page2"
          className="rounded-full border border-white px-2 py-1 sm:px-3 sm:py-1.5 text-[10px] sm:text-xs text-black bg-white touch-manipulation"
        >
          Page 2
        </Link>
      </div>

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
  );
}
