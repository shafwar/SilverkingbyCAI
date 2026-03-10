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
  const t = useTranslations("admin.analytics");
  const defaultEmptyState = emptyState ?? t("noRecordsAvailable");
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
      <div className="rounded-2xl border border-white/10 bg-white/[0.02] px-5 py-12 text-center text-white/50 text-sm">
        {defaultEmptyState}
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.02]">
      {/* Desktop Table */}
      <div className="hidden md:block overflow-x-auto">
        <table className="min-w-full">
          <thead className="border-b border-white/10 bg-white/[0.04]">
            <tr>
              {columns.map((column) => (
                <th
                  key={String(column.key)}
                  scope="col"
                  onClick={() => handleSort(column)}
                  className={clsx(
                    "px-5 py-3.5 text-[11px] font-semibold uppercase tracking-wider text-white/60",
                    column.align === "center" && "text-center",
                    column.align === "right" && "text-right",
                    column.sortable && "cursor-pointer select-none hover:text-white/90"
                  )}
                >
                  <span className="inline-flex items-center gap-1.5">
                    {column.header}
                    {column.sortable && (
                      <ArrowDownUp className="h-3 w-3 text-white/40" />
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
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.2, delay: rowIndex * 0.02 }}
                  className="text-sm text-white/80 transition-colors hover:bg-white/[0.04]"
                >
                  {columns.map((column) => (
                    <td
                      key={String(column.key)}
                      className={clsx(
                        "px-5 py-3.5",
                        column.align === "center" && "text-center",
                        column.align === "right" && "text-right"
                      )}
                    >
                      {column.render
                        ? column.render(row)
                        : String(row[column.key as keyof T] ?? "—")}
                    </td>
                  ))}
                </motion.tr>
              ))}
            </AnimatePresence>
          </tbody>
        </table>
      </div>

      {/* Mobile Cards */}
      <div className="md:hidden divide-y divide-white/5">
        {sortedData.map((row, rowIndex) => (
          <motion.div
            key={rowIndex}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.25, delay: rowIndex * 0.02 }}
            className="p-3 sm:p-4 space-y-2 active:bg-white/5 transition-colors"
          >
            {columns.map((column, colIndex) => {
              const value = column.render
                ? column.render(row)
                : String(row[column.key as keyof T] ?? "—");
              // Skip first column on mobile if it's a checkbox/select column
              if (
                colIndex === 0 &&
                value != null &&
                typeof value === "object" &&
                value !== null &&
                "props" in value
              ) {
                const props = (value as any).props;
                if (props?.className?.includes("checkbox")) {
                  return null;
                }
              }
              return (
                <div key={String(column.key)} className="flex items-start justify-between gap-3">
                  <p className="text-[10px] sm:text-xs uppercase tracking-wide text-white/40 flex-shrink-0 min-w-[80px]">
                    {column.header}
                  </p>
                  <div className="text-right flex-1 min-w-0">
                    <p className="text-xs sm:text-sm text-white/80 break-words">
                      {String(value ?? "—")}
                    </p>
                  </div>
                </div>
              );
            })}
          </motion.div>
        ))}
      </div>
    </div>
  );
}
