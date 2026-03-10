import { prisma } from "@/lib/prisma";
import { QrPreviewGridGram } from "@/components/admin/QrPreviewGridGram";
import { QrPreviewLayout } from "@/components/admin/QrPreviewLayout";

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
    <QrPreviewLayout>
      <div className="space-y-4 sm:space-y-5">
        <QrPreviewGridGram
          batches={batches.map((batch) => ({
            batchId: batch.batchId,
            name: batch.batchName,
            weight: batch.batchWeight,
            weightGroup: batch.batchWeightGroup,
            itemCount: batch.items.length,
            firstItem: batch.items[0],
            allItems: batch.items,
          }))}
        />
      </div>
    </QrPreviewLayout>
  );
}
