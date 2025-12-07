"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { GramProductForm } from "@/components/admin/GramProductForm";

type GramProductEditPageClientProps = {
  batch: {
    id: number;
    name: string;
    weight: number;
    quantity: number;
  };
};

export function GramProductEditPageClient({ batch }: GramProductEditPageClientProps) {
  const t = useTranslations("admin.productsDetail");
  const router = useRouter();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.5em] text-white/60">{t("inventory")}</p>
          <h1 className="text-2xl font-semibold text-white">
            {t("edit")} – {batch.name}
          </h1>
        </div>
        <button
          onClick={() => router.push("/admin/products/page2")}
          className="rounded-full border border-white/15 px-4 py-2 text-xs text-white/70 hover:border-white/40"
        >
          Back to Products Page 2
        </button>
      </div>

      {/* Edit hanya mengubah metadata (nama) tanpa merubah uniqcode / jumlah QR */}
      <GramProductForm
        defaultValues={{
          id: batch.id,
          name: batch.name,
          weight: batch.weight,
          quantity: batch.quantity,
        }}
      />
    </div>
  );
}


