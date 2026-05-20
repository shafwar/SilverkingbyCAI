"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { ArrowLeft, LayoutTemplate } from "lucide-react";
import { AdminPageLayout } from "@/components/admin/AdminPageLayout";
import { SerticardPanel } from "@/components/admin/SerticardPanel";

export default function AdminSerticardPage() {
  const t = useTranslations("admin.serticard");

  const backLink = (
    <Link
      href="/admin/qr-preview"
      className="group inline-flex min-h-[40px] max-w-full touch-manipulation items-center justify-start gap-1.5 rounded-lg border border-white/[0.1] bg-white/[0.04] px-3 py-2 text-[13px] font-medium text-white/80 transition hover:border-white/18 hover:bg-white/[0.07] hover:text-white sm:min-h-0 sm:gap-2 sm:px-3.5 sm:text-sm"
    >
      <ArrowLeft className="h-3.5 w-3.5 shrink-0 transition-transform group-hover:-translate-x-0.5 sm:h-4 sm:w-4" strokeWidth={2} />
      {t("backToQrPreview")}
    </Link>
  );

  return (
    <AdminPageLayout
      eyebrow={t("eyebrow")}
      title={t("title")}
      description={t("description")}
      titleIcon={<LayoutTemplate className="h-[1.05rem] w-[1.05rem] sm:h-5 sm:w-5" aria-hidden />}
      leading={backLink}
      noContentPadding
      fluid
      detachedFromNav
      detailHeaderStyle="quiet"
    >
      <div className="w-full min-w-0 px-3.5 pb-10 pt-4 sm:px-5 sm:pb-12 sm:pt-5 md:px-6 md:pt-6">
        <SerticardPanel />
      </div>
    </AdminPageLayout>
  );
}
