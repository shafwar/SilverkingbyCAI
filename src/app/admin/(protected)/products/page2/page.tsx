import { prisma } from "@/lib/prisma";
import { GramProductsPageClient } from "../gram/GramProductsPageClient";

export const dynamic = "force-dynamic";

export default async function ProductsPage2() {
  const batches = await prisma.gramProductBatch.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      items: true,
    },
  });

  return (
    <GramProductsPageClient
      batches={batches.map((batch) => ({
        id: batch.id,
        name: batch.name,
        weight: batch.weight,
        quantity: batch.quantity,
        qrMode: batch.qrMode,
        weightGroup: batch.weightGroup,
        createdAt: batch.createdAt.toISOString(),
        qrCount: batch.items.length,
      }))}
    />
  );
}


