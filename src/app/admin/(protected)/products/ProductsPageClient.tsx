"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { ProductTable } from "@/components/admin/ProductTable";

type ProductsPageClientProps = {
  products: Array<{
    id: number;
    name: string;
    weight: number;
    serialCode: string;
    price: number | null;
    stock: number | null;
    createdAt: string;
    qrRecord: {
      qrImageUrl: string;
      scanCount: number;
    } | null;
  }>;
};

export function ProductsPageClient({ products }: ProductsPageClientProps) {
  const t = useTranslations('admin.productsDetail');

  return (
    <div className="space-y-6 h-[calc(100vh-8rem)] flex flex-col">
      <div className="flex items-center justify-between flex-shrink-0">
        <div>
          <p className="text-xs uppercase tracking-[0.5em] text-white/60">{t('inventory')}</p>
          <h1 className="text-2xl font-semibold text-white">{t('title')}</h1>
        </div>
        <Link
          href="/admin/products/create"
          className="rounded-full border border-white/15 px-4 py-2 text-sm text-white hover:border-white/40"
        >
          {t('addProduct')}
        </Link>
      </div>
      <div className="flex-1 overflow-y-auto pr-2 scrollbar-admin">
        <ProductTable products={products} />
      </div>
    </div>
  );
}

