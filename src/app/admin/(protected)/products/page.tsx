import { prisma } from "@/lib/prisma";
import { ProductsPageClient } from "./ProductsPageClient";

// Force dynamic rendering - this page requires database access and authentication
export const dynamic = "force-dynamic";

export default async function ProductsPage() {
  const products = await prisma.product.findMany({
    orderBy: { createdAt: "desc" },
    include: { qrRecord: true },
  });

  return (
    <ProductsPageClient
        products={products.map((product) => ({
          id: product.id,
          name: product.name,
          weight: product.weight,
          serialCode: product.serialCode,
          price: product.price,
          stock: product.stock,
          createdAt: product.createdAt.toISOString(),
          qrRecord: product.qrRecord
            ? {
                qrImageUrl: product.qrRecord.qrImageUrl,
                scanCount: product.qrRecord.scanCount,
              }
            : null,
        }))}
      />
  );
}
