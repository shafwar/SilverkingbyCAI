"use client";

import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { AdminPageLayout } from "@/components/admin/AdminPageLayout";

export default function ExportPage() {
  const t = useTranslations("admin.export");
  const tCommon = useTranslations("common");

  async function handleExport() {
    try {
      const res = await fetch("/api/export/excel");
      if (!res.ok) {
        throw new Error(t("exportFailed"));
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "silver-king-products.xlsx";
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);

      toast.success(t("exportSuccessful"), {
        description: t("excelDownloaded"),
        duration: 3000,
      });
    } catch (error: unknown) {
      toast.error(t("exportFailed"), {
        description: error instanceof Error ? error.message : tCommon("tryAgain"),
        duration: 4000,
      });
    }
  }

  return (
    <AdminPageLayout
      eyebrow={t("data")}
      title={t("title")}
      description={t("description")}
    >
      <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6 sm:p-8 max-w-lg">
        <button
          onClick={handleExport}
          className="rounded-xl border border-[#FFD700]/40 bg-[#FFD700]/10 px-6 py-3 text-sm font-semibold text-[#FFD700] transition hover:bg-[#FFD700]/20"
        >
          {t("exportToExcel")}
        </button>
      </div>
    </AdminPageLayout>
  );
}

