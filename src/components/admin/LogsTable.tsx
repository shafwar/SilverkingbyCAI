"use client";

import { useMemo, useState, useEffect } from "react";
import useSWR from "swr";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { Search, Download } from "lucide-react";

import { fetcher } from "@/lib/fetcher";
import { DateRangePicker, DateRangeOption } from "./DateRangePicker";
import { DataTable, TableColumn } from "./DataTable";
import { AnimatedCard } from "./AnimatedCard";

type LogItem = {
  id: number;
  productName: string;
  serialCode: string;
  scannedAt: string;
  ip?: string | null;
  userAgent?: string | null;
  location?: string | null;
};

type LogsResponse = {
  logs: LogItem[];
  meta: { page: number; totalPages: number; total: number };
};

export function LogsTable() {
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
      { key: "productName", header: "Product", sortable: true },
      {
        key: "serialCode",
        header: "Serial",
        sortable: true,
        render: (row) => <span className="font-mono text-xs">{row.serialCode}</span>,
      },
      {
        key: "scannedAt",
        header: "Timestamp",
        render: (row) => new Date(row.scannedAt).toLocaleString(),
        sortable: true,
      },
      {
        key: "ip",
        header: "IP",
        render: (row) => row.ip ?? "—",
      },
      {
        key: "userAgent",
        header: "User Agent",
        render: (row) => <span className="line-clamp-1 text-xs text-white/60">{row.userAgent ?? "—"}</span>,
      },
    ],
    []
  );

  const handleExport = () => {
    toast.info("Exporting data", {
      description: "Opening export in new window...",
      duration: 2000,
    });
    window.open("/api/export/excel", "_blank");
  };

  return (
    <AnimatedCard>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.35em] text-white/50">Security</p>
          <h3 className="mt-2 text-2xl font-semibold">Scan logs</h3>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="flex items-center rounded-full border border-white/10 bg-white/5 px-3">
            <Search className="h-4 w-4 text-white/50" />
            <input
              type="text"
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
              placeholder="Search serial, product, IP..."
              className="w-48 bg-transparent px-3 py-2 text-sm text-white focus:outline-none"
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
            className="inline-flex items-center gap-2 rounded-full border border-[#FFD700]/40 px-4 py-2 text-sm text-white transition hover:border-[#FFD700] hover:bg-[#FFD700]/10"
          >
            <Download className="h-4 w-4" />
            Export
          </button>
        </div>
      </div>

      <div className="mt-6">
        <DataTable columns={columns} data={data?.logs ?? []} isLoading={isLoading} />
      </div>

      {error && <p className="mt-4 text-sm text-red-400">Failed to load logs.</p>}

      {data && (
        <div className="mt-6 flex items-center justify-between text-sm text-white/60">
          <button
            onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
            disabled={page === 1}
            className="rounded-full border border-white/10 px-4 py-2 transition hover:border-white/30 disabled:opacity-30"
          >
            Previous
          </button>
          <motion.span
            key={page}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-white"
          >
            Page {page} of {data.meta.totalPages}
          </motion.span>
          <button
            onClick={() => setPage((prev) => Math.min(prev + 1, data.meta.totalPages))}
            disabled={page >= data.meta.totalPages}
            className="rounded-full border border-white/10 px-4 py-2 transition hover:border-white/30 disabled:opacity-30"
          >
            Next
          </button>
        </div>
      )}
    </AnimatedCard>
  );
}


