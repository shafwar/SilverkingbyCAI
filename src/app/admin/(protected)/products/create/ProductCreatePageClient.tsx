"use client";

import { useTranslations } from "next-intl";
import { ProductForm } from "@/components/admin/ProductForm";

type ProductCreatePageClientProps = {
  product?: {
    id: number;
    name: string;
    weight: number;
    serialCode: string;
    price?: number;
    stock?: number;
  };
};

export function ProductCreatePageClient({ product }: ProductCreatePageClientProps) {
  const t = useTranslations('admin.productsDetail');

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs uppercase tracking-[0.5em] text-white/60">{t('inventory')}</p>
        <h1 className="text-2xl font-semibold text-white">
          {product ? t('edit') : t('create')}
        </h1>
      </div>
      <ProductForm defaultValues={product} />
    </div>
  );
}

