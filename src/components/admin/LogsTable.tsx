"use client";

import { useMemo, useState, useEffect } from "react";
import useSWR from "swr";
import { useTranslations } from "next-intl";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { Search, Download } from "lucide-react";

import { fetcher } from "@/lib/fetcher";
import { DateRangePicker, DateRangeOption } from "./DateRangePicker";
import { DataTable, TableColumn } from "./DataTable";
import { AnimatedCard } from "./AnimatedCard";

type LogItem = {
  id: string | number;
  productName: string;
  serialCode: string;
  scannedAt: string;
  ip?: string | null;
  userAgent?: string | null;
  location?: string | null;
  source?: "page1" | "page2";
};

type LogsResponse = {
  logs: LogItem[];
  meta: {
    page: number;
    totalPages: number;
    total: number;
    page1Total?: number;
    page2Total?: number;
  };
};

export function LogsTable() {
  const t = useTranslations("admin");
  const tExport = useTranslations("admin.export");
  const tLogs = useTranslations("admin.logsDetail");
  const tPagination = useTranslations("admin.pagination");
  const tCommon = useTranslations("common");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [dateRange, setDateRange] = useState<DateRangeOption>("7d");
  const [page, setPage] = useState(1);

  useEffect(() => {
    const handle = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(handle);
  }, [search]);

  const dateQuery = useMemo(() => {
    const now = new Date();
    const to = now.toISOString();
    if (dateRange === "custom") return "";
    const days = dateRange === "7d" ? 7 : 30;
    const fromDate = new Date(now);
    fromDate.setDate(now.getDate() - days);
    return `&from=${fromDate.toISOString()}&to=${to}`;
  }, [dateRange]);

  const query = `/api/admin/logs?page=${page}&pageSize=10${debouncedSearch ? `&q=${debouncedSearch}` : ""}${
    dateQuery ? dateQuery : ""
  }`;

  const { data, isLoading, error, mutate } = useSWR<LogsResponse>(query, fetcher, {
    refreshInterval: 20000,
  });

  const columns: TableColumn<LogItem>[] = useMemo(
    () => [
      {
        key: "productName",
        header: tLogs("product"),
        sortable: true,
        render: (row) => (
          <div className="flex items-center gap-2">
            <span>{row.productName}</span>
            {row.source === "page2" && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30">
                Page 2
              </span>
            )}
          </div>
        ),
      },
      {
        key: "serialCode",
        header: tLogs("serial"),
        sortable: true,
        render: (row) => <span className="font-mono text-xs">{row.serialCode}</span>,
      },
      {
        key: "scannedAt",
        header: tLogs("timestamp"),
        render: (row) => new Date(row.scannedAt).toLocaleString(),
        sortable: true,
      },
      {
        key: "ip",
        header: tLogs("ip"),
        render: (row) => row.ip ?? "—",
      },
      {
        key: "userAgent",
        header: tLogs("userAgent"),
        render: (row) => (
          <span className="line-clamp-1 text-xs text-white/60">{row.userAgent ?? "—"}</span>
        ),
      },
    ],
    [tLogs]
  );

  const handleExport = () => {
    toast.info(t("analytics.exportData"), {
      description: t("export.exportOpening"),
      duration: 2000,
    });
    window.open("/api/export/excel", "_blank");
  };

  return (
    <AnimatedCard>
      <div className="flex flex-col gap-3 sm:gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-[10px] sm:text-xs uppercase tracking-[0.3em] sm:tracking-[0.35em] text-white/50">
            {t("analytics.security")}
          </p>
          <h3 className="mt-1.5 sm:mt-2 text-lg sm:text-xl md:text-2xl font-semibold">
            {t("analytics.scanLogs")}
          </h3>
        </div>
        <div className="flex flex-col gap-2 sm:gap-3 sm:flex-row sm:items-center">
          <div className="flex items-center rounded-full border border-white/10 bg-white/5 px-2.5 sm:px-3">
            <Search className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-white/50 flex-shrink-0" />
            <input
              type="text"
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
              placeholder={t("analytics.search")}
              className="w-full sm:w-48 bg-transparent px-2 sm:px-3 py-2 text-xs sm:text-sm text-white focus:outline-none"
            />
          </div>
          <DateRangePicker
            value={dateRange}
            onChange={(value) => {
              setDateRange(value);
              setPage(1);
              mutate();
            }}
          />
          <button
            onClick={handleExport}
            className="inline-flex items-center justify-center gap-1.5 sm:gap-2 rounded-full border border-[#FFD700]/40 px-3 sm:px-4 py-2 text-xs sm:text-sm text-white transition hover:border-[#FFD700] hover:bg-[#FFD700]/10 active:scale-95 touch-manipulation"
          >
            <Download className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            <span className="hidden sm:inline">{tExport("label")}</span>
            <span className="sm:hidden">{tExport("label")}</span>
          </button>
        </div>
      </div>

      <div className="mt-6">
        <DataTable columns={columns} data={data?.logs ?? []} isLoading={isLoading} />
      </div>

      {error && <p className="mt-4 text-sm text-red-400">Failed to load logs.</p>}

      {data && (
        <div className="mt-4 sm:mt-6 flex items-center justify-between gap-2 text-xs sm:text-sm text-white/60">
          <button
            onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
            disabled={page === 1}
            className="rounded-full border border-white/10 px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm transition hover:border-white/30 disabled:opacity-30 active:scale-95 touch-manipulation"
          >
            {tPagination("previous")}
          </button>
          <motion.span
            key={page}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-white text-xs sm:text-sm text-center min-w-[100px] sm:min-w-0"
          >
            {tPagination("page")} {page} {tPagination("of")} {data.meta.totalPages}
          </motion.span>
          <button
            onClick={() => setPage((prev) => Math.min(prev + 1, data.meta.totalPages))}
            disabled={page >= data.meta.totalPages}
            className="rounded-full border border-white/10 px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm transition hover:border-white/30 disabled:opacity-30 active:scale-95 touch-manipulation"
          >
            {tPagination("next")}
          </button>
        </div>
      )}
    </AnimatedCard>
  );
}
