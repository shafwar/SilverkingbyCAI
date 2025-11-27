"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowDownUp } from "lucide-react";
import clsx from "clsx";
import { LoadingSkeleton } from "./LoadingSkeleton";

export type TableColumn<T> = {
  key: keyof T | string;
  header: string;
  sortable?: boolean;
  align?: "left" | "center" | "right";
  render?: (row: T) => React.ReactNode;
};

type DataTableProps<T> = {
  columns: TableColumn<T>[];
  data: T[];
  isLoading?: boolean;
  emptyState?: string;
};

export function DataTable<T extends Record<string, any>>({
  columns,
  data,
  isLoading,
  emptyState,
}: DataTableProps<T>) {
  const t = useTranslations('admin.analytics');
  const defaultEmptyState = emptyState ?? t('noRecordsAvailable');
  const [sortKey, setSortKey] = useState<TableColumn<T>["key"]>();
  const [direction, setDirection] = useState<"asc" | "desc">("asc");

  const sortedData = useMemo(() => {
    if (!sortKey) return data;
    return [...data].sort((a, b) => {
      const valueA = a[sortKey as keyof T];
      const valueB = b[sortKey as keyof T];
      if (valueA === valueB) return 0;
      if (valueA == null) return -1;
      if (valueB == null) return 1;
      return direction === "asc"
        ? String(valueA).localeCompare(String(valueB))
        : String(valueB).localeCompare(String(valueA));
    });
  }, [data, direction, sortKey]);

  const handleSort = (column: TableColumn<T>) => {
    if (!column.sortable) return;
    if (sortKey === column.key) {
      setDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(column.key);
      setDirection("asc");
    }
  };

  if (isLoading) {
    return <LoadingSkeleton className="h-64 w-full" />;
  }

  if (!sortedData.length) {
    return (
      <div className="rounded-3xl border border-white/5 bg-white/5 p-10 text-center text-white/60">
        {defaultEmptyState}
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl sm:rounded-2xl md:rounded-3xl border border-white/10">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-white/10">
          <thead>
            <tr className="bg-white/5">
              {columns.map((column) => (
                <th
                  key={String(column.key)}
                  scope="col"
                  onClick={() => handleSort(column)}
                  className={clsx(
                    "px-2 sm:px-3 md:px-4 py-2 sm:py-2.5 md:py-3 text-left text-[10px] sm:text-xs font-light uppercase tracking-[0.2em] sm:tracking-[0.3em] text-white/60",
                    column.align === "center" && "text-center",
                    column.align === "right" && "text-right",
                    column.sortable && "cursor-pointer select-none hover:text-white"
                  )}
                >
                  <span className="inline-flex items-center gap-1 sm:gap-2">
                    {column.header}
                    {column.sortable && (
                      <ArrowDownUp className="h-2.5 w-2.5 sm:h-3 sm:w-3 text-white/40" />
                    )}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            <AnimatePresence>
              {sortedData.map((row, rowIndex) => (
                <motion.tr
                  key={rowIndex}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -12 }}
                  transition={{ duration: 0.25, delay: rowIndex * 0.02 }}
                  className="bg-white/[0.015] text-xs sm:text-sm text-white/80"
                >
                  {columns.map((column) => (
                    <td
                      key={String(column.key)}
                      className={clsx(
                        "px-2 sm:px-3 md:px-4 py-2.5 sm:py-3 md:py-4",
                        column.align === "center" && "text-center",
                        column.align === "right" && "text-right"
                      )}
                    >
                      {column.render ? column.render(row) : String(row[column.key as keyof T] ?? "—")}
                    </td>
                  ))}
                </motion.tr>
              ))}
            </AnimatePresence>
          </tbody>
        </table>
      </div>
    </div>
  );
}


