"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { GramProductForm } from "@/components/admin/GramProductForm";

export function GramProductCreatePageClient() {
  const t = useTranslations("admin.productsDetail");
  const router = useRouter();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.5em] text-white/60">
            {t("inventory")} – Page 2
          </p>
          <h1 className="text-2xl font-semibold text-white">
            {t("addProduct")} (Gram-based QR)
          </h1>
        </div>
        <button
          onClick={() => router.push("/admin/products/gram")}
          className="rounded-full border border-white/15 px-4 py-2 text-xs text-white/70 hover:border-white/40"
        >
          Back to Products Page 2
        </button>
      </div>

      <GramProductForm />
    </div>
  );
}


