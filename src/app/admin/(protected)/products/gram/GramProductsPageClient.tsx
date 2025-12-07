"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { GramProductTable } from "@/components/admin/GramProductTable";

type GramBatchRow = {
  id: number;
  name: string;
  weight: number;
  quantity: number;
  qrMode: string;
  weightGroup: string | null;
  createdAt: string;
  qrCount: number;
};

export function GramProductsPageClient({ batches }: { batches: GramBatchRow[] }) {
  const t = useTranslations("admin.productsDetail");

  return (
    <div className="space-y-6 h-[calc(100vh-8rem)] flex flex-col">
      <div className="flex items-center justify-between flex-shrink-0">
        <div>
          <p className="text-xs uppercase tracking-[0.5em] text-white/60">
            {t("inventory")} – Page 2
          </p>
          <h1 className="text-2xl font-semibold text-white">
            {t("title")} (Gram-based QR)
          </h1>
        </div>
        <div className="flex items-center gap-3">
          {/* Page switcher: Page 1 / Page 2 (matching QR Preview style) */}
          <div className="flex rounded-full border border-white/20 bg-white/5 p-1 text-xs">
            <Link
              href="/admin/products"
              className="rounded-full px-3 py-1.5 text-xs text-white/70 hover:border-white/60"
            >
              Page 1
            </Link>
            <Link
              href="/admin/products/page2"
              className="rounded-full border border-white px-3 py-1.5 text-xs text-black bg-white"
            >
              Page 2
            </Link>
          </div>
          <Link
            href="/admin/products/page2/create"
            className="rounded-full border border-white/15 px-4 py-2 text-sm text-white hover:border-white/40"
          >
            {t("addProduct")}
          </Link>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto pr-2 scrollbar-admin">
        <GramProductTable batches={batches} />
      </div>
    </div>
  );
}


