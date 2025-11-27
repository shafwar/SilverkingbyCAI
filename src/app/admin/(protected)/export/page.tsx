"use client";

import { useTranslations } from "next-intl";
import { toast } from "sonner";

export default function ExportPage() {
  const t = useTranslations('admin.export');
  const tCommon = useTranslations('common');

  async function handleExport() {
    try {
      const res = await fetch("/api/export/excel");
      if (!res.ok) {
        throw new Error(t('exportFailed'));
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

      toast.success(t('exportSuccessful'), {
        description: t('excelDownloaded'),
        duration: 3000,
      });
    } catch (error: any) {
      toast.error(t('exportFailed'), {
        description: error.message || tCommon('tryAgain'),
        duration: 4000,
      });
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs uppercase tracking-[0.5em] text-white/60">{t('data')}</p>
        <h1 className="text-2xl font-semibold text-white">{t('title')}</h1>
        <p className="text-sm text-white/50">
          {t('description')}
        </p>
      </div>
      <button
        onClick={handleExport}
        className="rounded-full bg-gradient-to-r from-[#FFD700] to-[#C0C0C0] px-6 py-3 text-black font-semibold"
      >
        {t('exportToExcel')}
      </button>
    </div>
  );
}

