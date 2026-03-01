"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { AdminPageLayout } from "@/components/admin/AdminPageLayout";
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
  const t = useTranslations("admin.productsDetail");

  const actions = (
    <div className="flex items-center gap-2 sm:gap-3 flex-wrap sm:flex-nowrap">
      <div className="flex rounded-2xl border border-white/10 bg-white/5 p-1.5 shadow-inner">
        <Link
          href="/admin/products"
          className="rounded-xl px-4 py-2 text-xs font-medium text-black bg-white shadow-sm touch-manipulation"
        >
          Page 1
        </Link>
        <Link
          href="/admin/products/page2"
          className="rounded-xl px-4 py-2 text-xs font-medium text-white/70 hover:bg-white/10 hover:text-white touch-manipulation"
        >
          Page 2
        </Link>
      </div>
      <Link
        href="/admin/products/create"
        className="rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-xs font-medium text-white hover:border-[#FFD700]/30 hover:bg-[#FFD700]/10 touch-manipulation whitespace-nowrap transition"
      >
        {t("addProduct")}
      </Link>
    </div>
  );

  return (
    <AdminPageLayout
      eyebrow={t("inventory")}
      title={t("title")}
      actions={actions}
    >
      <ProductTable products={products} />
    </AdminPageLayout>
  );
}
