"use client";

import { useMemo, useState } from "react";
import useSWR from "swr";
import { useTranslations } from "next-intl";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import { motion } from "framer-motion";
import { Download, Archive, Loader2, CheckCircle2, AlertCircle, X } from "lucide-react";
import { toast } from "sonner";

import { fetcher } from "@/lib/fetcher";
import { MonthYearPicker } from "./MonthYearPicker";
import { AnimatedCard } from "./AnimatedCard";
import { LoadingSkeleton } from "./LoadingSkeleton";
import { DataTable, TableColumn } from "./DataTable";

type TrendResponse = {
  data: { date: string; count: number }[];
  month?: number | null;
  year?: number | null;
};

type TopProductsResponse = {
  products: { name: string; scans: number }[];
};

type LogsResponse = {
  logs: { scannedAt: string }[];
};

export function AnalyticsPanel() {
  const t = useTranslations('admin.analytics');
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1); // 1-indexed
  const [year, setYear] = useState(now.getFullYear());
  const [purging, setPurging] = useState(false);
  const [purgeResult, setPurgeResult] = useState<{
    success: boolean;
    month: number;
    year: number;
    page1Deleted: number;
    page2Deleted: number;
    csvRows: number;
    filename: string;
    downloadUrl: string;
    verified: boolean;
    r2Uploaded: boolean;
    remainingPage1Logs: number;
    remainingPage2Logs: number;
  } | null>(null);

  // Check if viewing current month - only real-time updates for current month
  const isCurrentMonth = useMemo(() => {
    const currentDate = new Date();
    return year === currentDate.getFullYear() && month === currentDate.getMonth() + 1;
  }, [month, year]);

  // Can purge only past months (not current month)
  const canPurgeSelectedMonth = useMemo(() => {
    const currentDate = new Date();
    if (year > currentDate.getFullYear()) return false;
    if (year === currentDate.getFullYear() && month >= currentDate.getMonth() + 1) return false;
    return true;
  }, [month, year]);

  const { data: trend, isLoading: trendLoading, mutate: mutateTrend } = useSWR<TrendResponse>(
    `/api/admin/scans/trend?month=${month}&year=${year}`,
    fetcher,
    {
      // Only refresh in real-time for current month (every 30 seconds)
      // History months don't need real-time updates
      refreshInterval: isCurrentMonth ? 30000 : 0,
      revalidateOnFocus: isCurrentMonth, // Revalidate on focus only for current month
      revalidateOnReconnect: true, // Always revalidate when connection is restored
      dedupingInterval: 5000, // Dedupe requests within 5 seconds
    }
  );

  const handleMonthYearChange = (newMonth: number, newYear: number) => {
    setMonth(newMonth);
    setYear(newYear);
    // Clear purge result when month changes
    setPurgeResult(null);
    // Immediately fetch new data when month changes
    mutateTrend();
  };

  const { data: top, isLoading: topLoading } = useSWR<TopProductsResponse>(
    "/api/admin/scans/top-products",
    fetcher,
    {
      refreshInterval: 60000, // Refresh every minute for top products
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
      dedupingInterval: 5000,
    }
  );

  const { data: logs } = useSWR<LogsResponse>("/api/admin/logs?limit=200", fetcher, {
    refreshInterval: 30000, // Refresh every 30 seconds for logs (real-time activity)
    revalidateOnFocus: true,
    revalidateOnReconnect: true,
    dedupingInterval: 5000,
  });

  const trendSeries = trend?.data ?? [];
  const trendLoadingState = trendLoading;
  const topData = top;
  const topLoadingState = topLoading;
  const logsData = logs;

  const heatmap = useMemo(() => {
    const hours = Array.from({ length: 24 }).map((_, index) => ({
      hour: index,
      count: 0,
    }));
    logsData?.logs.forEach((log) => {
      const hour = new Date(log.scannedAt).getHours();
      hours[hour].count += 1;
    });
    const max = Math.max(...hours.map((h) => h.count), 1);
    return hours.map((item) => ({
      ...item,
      intensity: item.count / max,
    }));
  }, [logsData]);

  const columns: TableColumn<{ name: string; scans: number; share: string }>[] = [
    { key: "name", header: t('product'), sortable: true },
    { key: "scans", header: t('scans'), sortable: true },
    { key: "share", header: t('share'), sortable: true },
  ];

  const tableData =
    topData?.products.map((product) => {
      const total = topData.products.reduce((acc, curr) => acc + curr.scans, 0) || 1;
      const share = `${((product.scans / total) * 100).toFixed(1)}%`;
      return { name: product.name, scans: product.scans, share };
    }) ?? [];

  return (
    <div className="space-y-4 sm:space-y-5 md:space-y-6">
      <AnimatedCard>
        <div className="flex flex-col gap-3 sm:gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex-1 min-w-0">
            <p className="text-[10px] sm:text-xs uppercase tracking-[0.3em] sm:tracking-[0.35em] text-white/50">{t('signalControl')}</p>
            <h3 className="mt-1.5 sm:mt-2 text-lg sm:text-xl md:text-2xl font-semibold text-white leading-tight">{t('scansOverTime')}</h3>
          </div>
          <div className="flex flex-wrap items-center gap-2 sm:gap-3 flex-shrink-0">
            <MonthYearPicker month={month} year={year} onChange={handleMonthYearChange} />
            <button
              onClick={async () => {
                setPurging(true);
                setPurgeResult(null);
                try {
                  const res = await fetch("/api/admin/export-and-purge-logs", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ month, year }),
                  });
                  const data = await res.json();
                  if (!res.ok) throw new Error(data.error || "Purge failed");
                  
                  // Store result for detailed display
                  setPurgeResult(data);
                  
                  // Show success toast with key info
                  if (data.verified && data.r2Uploaded) {
                    toast.success(
                      `✅ Purge berhasil! ${data.page1Deleted + data.page2Deleted} logs dihapus, CSV tersimpan di R2`,
                      { duration: 5000 }
                    );
                  } else {
                    toast.warning(
                      `⚠️ Purge selesai dengan peringatan. Verifikasi: ${data.verified ? "OK" : "GAGAL"}, R2: ${data.r2Uploaded ? "OK" : "GAGAL"}`,
                      { duration: 7000 }
                    );
                  }
                  
                  mutateTrend();
                } catch (e) {
                  toast.error(e instanceof Error ? e.message : "Purge failed");
                  setPurgeResult(null);
                } finally {
                  setPurging(false);
                }
              }}
              disabled={purging || !canPurgeSelectedMonth}
              title={
                canPurgeSelectedMonth
                  ? `Export & purge ${month}/${year}`
                  : "Hanya bulan lalu yang bisa di-purge"
              }
              className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/50 bg-amber-500/10 px-3 py-1.5 text-xs text-amber-400 hover:bg-amber-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {purging ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Archive className="h-3.5 w-3.5" />}
              <span className="hidden sm:inline">
                {purging ? "Memproses..." : "Purge bulan terpilih"}
              </span>
            </button>
            <button
              onClick={async () => {
                const url = `/api/admin/scans/export?month=${month}&year=${year}`;
                const res = await fetch(url);
                if (!res.ok) {
                  const data = await res.json().catch(() => ({}));
                  alert(data.error || "Export failed");
                  return;
                }
                const ct = res.headers.get("content-type") || "";
                if (ct.includes("application/json")) {
                  const { url: redirectUrl } = await res.json();
                  if (redirectUrl) window.open(redirectUrl, "_blank");
                } else {
                  const blob = await res.blob();
                  const a = document.createElement("a");
                  a.href = URL.createObjectURL(blob);
                  a.download = `${year}-${String(month).padStart(2, "0")}.csv`;
                  a.click();
                  URL.revokeObjectURL(a.href);
                }
              }}
              className="inline-flex items-center gap-1.5 sm:gap-2 rounded-full border border-[#FFD700]/40 px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm text-white transition hover:border-[#FFD700]"
            >
              <Download className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">{t('exportCSV')}</span>
              <span className="sm:hidden">{t('export')}</span>
            </button>
          </div>
        </div>
        
        {/* Purge Success Indicator */}
        {purgeResult && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="mt-4 rounded-lg border p-4"
            style={{
              borderColor: purgeResult.verified && purgeResult.r2Uploaded 
                ? "rgba(34, 197, 94, 0.3)" 
                : "rgba(251, 191, 36, 0.3)",
              backgroundColor: purgeResult.verified && purgeResult.r2Uploaded 
                ? "rgba(34, 197, 94, 0.05)" 
                : "rgba(251, 191, 36, 0.05)",
            }}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  {purgeResult.verified && purgeResult.r2Uploaded ? (
                    <CheckCircle2 className="h-5 w-5 text-green-400 flex-shrink-0" />
                  ) : (
                    <AlertCircle className="h-5 w-5 text-amber-400 flex-shrink-0" />
                  )}
                  <h4 className="text-sm font-semibold text-white">
                    {purgeResult.verified && purgeResult.r2Uploaded 
                      ? "✅ Purge Berhasil" 
                      : "⚠️ Purge Selesai dengan Peringatan"}
                  </h4>
                </div>
                <div className="space-y-1.5 text-xs text-white/70 ml-7">
                  <div className="flex items-center gap-2">
                    <span className="w-24 flex-shrink-0">Bulan:</span>
                    <span className="font-mono font-semibold text-white">
                      {purgeResult.year}-{String(purgeResult.month).padStart(2, "0")}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-24 flex-shrink-0">Logs dihapus:</span>
                    <span className="text-white">
                      {purgeResult.page1Deleted + purgeResult.page2Deleted} 
                      {purgeResult.page1Deleted > 0 && purgeResult.page2Deleted > 0 && (
                        <span className="text-white/50 ml-1">
                          ({purgeResult.page1Deleted} Page 1 + {purgeResult.page2Deleted} Page 2)
                        </span>
                      )}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-24 flex-shrink-0">Database kosong:</span>
                    {purgeResult.verified ? (
                      <span className="text-green-400 font-semibold flex items-center gap-1">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Ya ({purgeResult.remainingPage1Logs + purgeResult.remainingPage2Logs} tersisa)
                      </span>
                    ) : (
                      <span className="text-red-400 font-semibold flex items-center gap-1">
                        <AlertCircle className="h-3.5 w-3.5" />
                        Tidak ({purgeResult.remainingPage1Logs + purgeResult.remainingPage2Logs} masih ada)
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-24 flex-shrink-0">CSV di R2:</span>
                    {purgeResult.r2Uploaded ? (
                      <span className="text-green-400 font-semibold flex items-center gap-1">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Tersedia ({purgeResult.csvRows} baris)
                      </span>
                    ) : (
                      <span className="text-red-400 font-semibold flex items-center gap-1">
                        <AlertCircle className="h-3.5 w-3.5" />
                        Tidak ditemukan
                      </span>
                    )}
                  </div>
                  {purgeResult.downloadUrl && (
                    <div className="flex items-center gap-2 mt-2 pt-2 border-t border-white/10">
                      <a
                        href={purgeResult.downloadUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs text-amber-400 hover:text-amber-300 underline"
                      >
                        <Download className="h-3.5 w-3.5" />
                        Download CSV: {purgeResult.filename}
                      </a>
                    </div>
                  )}
                </div>
              </div>
              <button
                onClick={() => setPurgeResult(null)}
                className="text-white/40 hover:text-white/60 transition-colors flex-shrink-0"
                aria-label="Tutup"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </motion.div>
        )}
        
        <div className="mt-4 sm:mt-5 md:mt-6 h-64 sm:h-72 md:h-80">
          {trendLoadingState && <LoadingSkeleton className="h-full w-full" />}
          {!!trendSeries.length && (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendSeries} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                <CartesianGrid stroke="#ffffff10" vertical={false} />
                <XAxis 
                  dataKey="date" 
                  stroke="#ffffff60" 
                  tick={{ fontSize: 11 }}
                  interval="preserveStartEnd"
                />
                <YAxis 
                  stroke="#ffffff60" 
                  tick={{ fontSize: 11 }}
                  width={40}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#050505",
                    borderRadius: "12px",
                    border: "1px solid #ffffff20",
                    fontSize: "12px",
                    padding: "8px 12px",
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="count"
                  stroke="#FFD700"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </AnimatedCard>

      <div className="grid gap-4 sm:gap-5 md:gap-6 lg:grid-cols-5">
        <AnimatedCard className="lg:col-span-3">
          <div className="mb-3 sm:mb-4">
            <p className="text-[10px] sm:text-xs uppercase tracking-[0.3em] sm:tracking-[0.35em] text-white/50">{t('aggregatedMetrics')}</p>
            <h3 className="mt-1.5 sm:mt-2 text-lg sm:text-xl md:text-2xl font-semibold text-white leading-tight">{t('topPerforming')}</h3>
          </div>
          <DataTable columns={columns} data={tableData} isLoading={topLoadingState} />
        </AnimatedCard>

        <AnimatedCard className="lg:col-span-2">
          <div className="mb-3 sm:mb-4">
            <p className="text-[10px] sm:text-xs uppercase tracking-[0.3em] sm:tracking-[0.35em] text-white/50">{t('hourlyHeatmap')}</p>
            <h3 className="mt-1.5 sm:mt-2 text-lg sm:text-xl md:text-2xl font-semibold text-white leading-tight">{t('activityIntensity')}</h3>
          </div>
          <div className="grid grid-cols-4 sm:grid-cols-6 gap-1.5 sm:gap-2">
            {heatmap.map((item) => (
              <motion.div
                key={item.hour}
                className="flex h-12 sm:h-14 md:h-16 flex-col items-center justify-center rounded-xl sm:rounded-2xl border border-white/5 text-[10px] sm:text-xs text-white/60"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: item.hour * 0.01 }}
                style={{
                  background: `linear-gradient(180deg, rgba(255,215,0,${item.intensity}) 0%, rgba(0,0,0,0.4) 100%)`,
                }}
              >
                <span className="font-semibold text-white text-xs sm:text-sm">{item.count}</span>
                <span className="text-[9px] sm:text-xs">{item.hour}:00</span>
              </motion.div>
            ))}
          </div>
        </AnimatedCard>
      </div>
    </div>
  );
}


