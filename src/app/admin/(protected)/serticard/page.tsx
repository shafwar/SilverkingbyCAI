"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { LayoutTemplate } from "lucide-react";
import { AdminPageLayout } from "@/components/admin/AdminPageLayout";
import { SerticardPanel } from "@/components/admin/SerticardPanel";

export default function AdminSerticardPage() {
  const t = useTranslations("admin.serticard");
  const tNav = useTranslations("admin");

  return (
    <AdminPageLayout
      eyebrow={t("eyebrow")}
      title={t("title")}
      description={t("description")}
      titleIcon={<LayoutTemplate className="h-5 w-5 sm:h-[1.15rem] sm:w-[1.15rem]" aria-hidden />}
      actions={
        <Link
          href="/admin/qr-preview"
          className="inline-flex items-center justify-center rounded-full border border-white/20 bg-white/5 px-4 py-2 text-xs font-medium text-white/90 transition hover:border-[#FFD700]/40 hover:bg-[#FFD700]/10"
        >
          {tNav("qrPreview")}
        </Link>
      }
    >
      <div className="space-y-6">
        <SerticardPanel />
      </div>
    </AdminPageLayout>
  );
}
