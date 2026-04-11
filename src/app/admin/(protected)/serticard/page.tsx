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
      className="group inline-flex min-h-[44px] max-w-full touch-manipulation items-center justify-start gap-2 rounded-xl border border-white/[0.12] bg-white/[0.05] px-3.5 py-2.5 text-sm font-medium text-white/85 transition hover:border-white/20 hover:bg-white/[0.08] hover:text-white sm:min-h-0 sm:px-4"
    >
      <ArrowLeft className="h-4 w-4 shrink-0 transition-transform group-hover:-translate-x-0.5" strokeWidth={2} />
      {t("backToQrPreview")}
    </Link>
  );

  return (
    <AdminPageLayout
      eyebrow={t("eyebrow")}
      title={t("title")}
      description={t("description")}
      titleIcon={<LayoutTemplate className="h-5 w-5 sm:h-[1.15rem] sm:w-[1.15rem]" aria-hidden />}
      leading={backLink}
      noContentPadding
      fluid
      detachedFromNav
    >
      <div className="w-full min-w-0 px-3.5 pb-10 pt-4 sm:px-5 sm:pb-12 sm:pt-5 md:px-6 md:pt-6">
        <SerticardPanel />
      </div>
    </AdminPageLayout>
  );
}
