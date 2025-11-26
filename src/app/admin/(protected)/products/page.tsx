import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { ProductTable } from "@/components/admin/ProductTable";

// Force dynamic rendering - this page requires database access and authentication
export const dynamic = "force-dynamic";

export default async function ProductsPage() {
  const products = await prisma.product.findMany({
    orderBy: { createdAt: "desc" },
    include: { qrRecord: true },
  });

  return (
    <div className="space-y-6 h-[calc(100vh-8rem)] flex flex-col">
      <div className="flex items-center justify-between flex-shrink-0">
        <div>
          <p className="text-xs uppercase tracking-[0.5em] text-white/60">Inventory</p>
          <h1 className="text-2xl font-semibold text-white">Products</h1>
        </div>
        <Link
          href="/admin/products/create"
          className="rounded-full border border-white/15 px-4 py-2 text-sm text-white hover:border-white/40"
        >
          Add Product
        </Link>
      </div>
      <div className="flex-1 overflow-y-auto pr-2 scrollbar-admin">
        <ProductTable
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
      </div>
    </div>
  );
}

