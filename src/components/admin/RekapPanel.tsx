"use client";

import { useState, useCallback, useEffect } from "react";
import { useTranslations } from "next-intl";
import { StatsHeader } from "./StatsHeader";
import { motion } from "framer-motion";
import { Download, FileSpreadsheet, Loader2, Archive } from "lucide-react";
import { toast } from "sonner";

type Report = {
  filename: string;
  key: string;
  year: number | null;
  month: number | null;
  url: string;
};

const MONTH_NAMES: Record<number, string> = {
  1: "January", 2: "February", 3: "March", 4: "April",
  5: "May", 6: "June", 7: "July", 8: "August",
  9: "September", 10: "October", 11: "November", 12: "December",
};

export function RekapPanel() {
  const t = useTranslations("admin.rekap");
  const tMonths = useTranslations("admin.months");
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  const loadReports = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/rekap/list");
      if (!res.ok) throw new Error("Failed to load reports");
      const data = await res.json();
      setReports(data.reports ?? []);
    } catch (e) {
      console.error("[Rekap] Load reports error:", e);
      toast.error(t("loadError"));
      setReports([]);
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    loadReports();
  }, [loadReports]);

  const handleDownload = async (filename: string) => {
    try {
      const res = await fetch(`/api/admin/rekap/download?file=${encodeURIComponent(filename)}`);
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to get download URL");
      }
      const { url } = await res.json();
      window.open(url, "_blank");
    } catch (e) {
      toast.error(t("downloadError"));
    }
  };

  const handleExportPurge = async () => {
    setExporting(true);
    try {
      const res = await fetch("/api/admin/export-and-purge-logs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Export failed");
      toast.success(t("exportSuccess", { month: data.month, year: data.year }));
      await loadReports();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("exportError"));
    } finally {
      setExporting(false);
    }
  };

  const monthLabel = (month: number | null) => {
    if (month == null) return "";
    const key = String(month).padStart(2, "0");
    try {
      return tMonths(key);
    } catch {
      return MONTH_NAMES[month] ?? String(month);
    }
  };

  return (
    <div className="space-y-8">
      <StatsHeader
        eyebrow={t("eyebrow")}
        title={t("title")}
        description={t("description")}
        actions={
          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleExportPurge}
            disabled={exporting}
            className="flex items-center gap-2 rounded-lg border border-amber-500/50 bg-amber-500/10 px-4 py-2 text-sm font-medium text-amber-400 transition hover:bg-amber-500/20 disabled:opacity-50"
          >
            {exporting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Archive className="h-4 w-4" />
            )}
            {exporting ? t("exporting") : t("exportPurgeButton")}
          </motion.button>
        }
      />

      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="rounded-xl border border-white/5 bg-[#0c0c0c] p-4 sm:p-6"
      >
        <h2 className="text-sm font-medium text-white/80 mb-4">{t("reportsTitle")}</h2>
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-white/40" />
          </div>
        ) : reports.length === 0 ? (
          <p className="py-8 text-center text-sm text-white/50">{t("noReports")}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/5 text-left text-white/60">
                  <th className="pb-3 pr-4 font-medium">{t("tableMonth")}</th>
                  <th className="pb-3 pr-4 font-medium">{t("tableFile")}</th>
                  <th className="pb-3 pl-2 text-right">
                    <span className="sr-only">{t("tableAction")}</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {reports.map((r) => (
                  <tr
                    key={r.key}
                    className="border-b border-white/5 last:border-0 hover:bg-white/[0.02]"
                  >
                    <td className="py-3 pr-4 text-white/90">
                      {r.year && r.month
                        ? `${monthLabel(r.month)} ${r.year}`
                        : r.filename}
                    </td>
                    <td className="py-3 pr-4 text-white/60 flex items-center gap-2">
                      <FileSpreadsheet className="h-4 w-4 shrink-0" />
                      {r.filename}
                    </td>
                    <td className="py-3 pl-2 text-right">
                      <button
                        onClick={() => handleDownload(r.filename)}
                        className="inline-flex items-center gap-1.5 rounded-md border border-white/10 bg-white/5 px-2.5 py-1.5 text-xs text-white/80 hover:bg-white/10"
                      >
                        <Download className="h-3.5 w-3.5" />
                        {t("download")}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </motion.section>
    </div>
  );
}
