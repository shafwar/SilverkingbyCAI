"use client";

import { useMemo, useState, useEffect, useCallback } from "react";
import useSWR from "swr";
import { useTranslations } from "next-intl";
import { motion } from "framer-motion";
import { Search, Mail, Check, X, Eye } from "lucide-react";
import { toast } from "sonner";

import { fetcher } from "@/lib/fetcher";
import { DataTable, TableColumn } from "./DataTable";
import { AnimatedCard } from "./AnimatedCard";
import { Modal } from "./Modal";

type FeedbackItem = {
  id: number;
  name: string;
  email: string;
  message: string;
  createdAt: string;
  read: boolean;
};

type FeedbackResponse = {
  feedbacks: FeedbackItem[];
  meta: {
    page: number;
    totalPages: number;
    total: number;
  };
};

export function FeedbackTable() {
  const t = useTranslations("admin");
  const tFeedback = useTranslations("admin.feedback");
  const tPagination = useTranslations("admin.pagination");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [readFilter, setReadFilter] = useState<string | null>(null);
  const [selectedMessage, setSelectedMessage] = useState<FeedbackItem | null>(null);

  useEffect(() => {
    const handle = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(handle);
  }, [search]);

  const query = `/api/admin/feedback?page=${page}&pageSize=20${debouncedSearch ? `&q=${debouncedSearch}` : ""}${
    readFilter !== null ? `&read=${readFilter}` : ""
  }`;

  const { data, isLoading, error, mutate } = useSWR<FeedbackResponse>(query, fetcher, {
    refreshInterval: 10000,
  });

  const handleToggleRead = useCallback(
    async (id: number, currentRead: boolean) => {
      try {
        const response = await fetch("/api/admin/feedback", {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ id, read: !currentRead }),
        });

        if (!response.ok) {
          throw new Error("Failed to update feedback");
        }

        toast.success(currentRead ? tFeedback("markedUnread") : tFeedback("markedRead"));
        mutate();
      } catch (error) {
        toast.error(tFeedback("updateError"));
      }
    },
    [mutate, tFeedback]
  );

  const columns: TableColumn<FeedbackItem>[] = useMemo(
    () => [
      {
        key: "read",
        header: "",
        align: "center",
        render: (row) => (
          <button
            onClick={() => handleToggleRead(row.id, row.read)}
            className={`p-1.5 rounded-full transition ${
              row.read
                ? "bg-green-500/20 text-green-400 hover:bg-green-500/30"
                : "bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30"
            }`}
            title={row.read ? tFeedback("markUnread") : tFeedback("markRead")}
          >
            {row.read ? <Check className="h-4 w-4" /> : <Mail className="h-4 w-4" />}
          </button>
        ),
      },
      {
        key: "name",
        header: tFeedback("name"),
        sortable: true,
        render: (row) => (
          <div className="flex items-center gap-2">
            <span className={row.read ? "text-white/60" : "text-white font-medium"}>
              {row.name}
            </span>
            {!row.read && <span className="h-2 w-2 rounded-full bg-yellow-400 animate-pulse" />}
          </div>
        ),
      },
      {
        key: "email",
        header: tFeedback("email"),
        sortable: true,
        render: (row) => (
          <a
            href={`mailto:${row.email}`}
            className={`text-sm hover:text-luxury-gold transition-colors ${
              row.read ? "text-white/50" : "text-white/70"
            }`}
          >
            {row.email}
          </a>
        ),
      },
      {
        key: "message",
        header: tFeedback("message"),
        render: (row) => {
          const isLongMessage = row.message.length > 100;
          return (
            <div className="max-w-md">
              <div
                className={`text-sm ${row.read ? "text-white/50" : "text-white/80"} ${isLongMessage ? "line-clamp-2" : ""}`}
              >
                {row.message}
              </div>
              {isLongMessage && (
                <button
                  onClick={() => setSelectedMessage(row)}
                  className="mt-2 inline-flex items-center gap-1.5 text-xs text-luxury-gold hover:text-luxury-lightGold transition-colors font-medium"
                >
                  <Eye className="h-3.5 w-3.5" />
                  {tFeedback("viewFull") || "View Full Message"}
                </button>
              )}
            </div>
          );
        },
      },
      {
        key: "createdAt",
        header: tFeedback("date"),
        render: (row) => (
          <span className={`text-xs ${row.read ? "text-white/40" : "text-white/60"}`}>
            {new Date(row.createdAt).toLocaleString()}
          </span>
        ),
        sortable: true,
      },
    ],
    [tFeedback, handleToggleRead]
  );

  return (
    <AnimatedCard>
      <div className="flex flex-col gap-3 sm:gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-[10px] sm:text-xs uppercase tracking-[0.3em] sm:tracking-[0.35em] text-white/50">
            {tFeedback("eyebrow")}
          </p>
          <h3 className="mt-1.5 sm:mt-2 text-lg sm:text-xl md:text-2xl font-semibold">
            {tFeedback("title")}
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
              placeholder={tFeedback("searchPlaceholder")}
              className="w-full sm:w-48 bg-transparent px-2 sm:px-3 py-2 text-xs sm:text-sm text-white focus:outline-none"
            />
          </div>
          <div className="flex gap-1.5 sm:gap-2">
            <button
              onClick={() => {
                setReadFilter(null);
                setPage(1);
              }}
              className={`px-2.5 sm:px-3 md:px-4 py-1.5 sm:py-2 text-[10px] sm:text-xs md:text-sm rounded-full border transition touch-manipulation ${
                readFilter === null
                  ? "border-[#FFD700]/40 bg-[#FFD700]/10 text-white"
                  : "border-white/10 bg-white/5 text-white/60 hover:border-white/20"
              }`}
            >
              {tFeedback("all")}
            </button>
            <button
              onClick={() => {
                setReadFilter("false");
                setPage(1);
              }}
              className={`px-2.5 sm:px-3 md:px-4 py-1.5 sm:py-2 text-[10px] sm:text-xs md:text-sm rounded-full border transition touch-manipulation ${
                readFilter === "false"
                  ? "border-yellow-500/40 bg-yellow-500/10 text-yellow-400"
                  : "border-white/10 bg-white/5 text-white/60 hover:border-white/20"
              }`}
            >
              {tFeedback("unread")}
            </button>
            <button
              onClick={() => {
                setReadFilter("true");
                setPage(1);
              }}
              className={`px-2.5 sm:px-3 md:px-4 py-1.5 sm:py-2 text-[10px] sm:text-xs md:text-sm rounded-full border transition touch-manipulation ${
                readFilter === "true"
                  ? "border-green-500/40 bg-green-500/10 text-green-400"
                  : "border-white/10 bg-white/5 text-white/60 hover:border-white/20"
              }`}
            >
              {tFeedback("read")}
            </button>
          </div>
        </div>
      </div>

      <div className="mt-6">
        <DataTable columns={columns} data={data?.feedbacks ?? []} isLoading={isLoading} />
      </div>

      {error && <p className="mt-4 text-sm text-red-400">{tFeedback("loadError")}</p>}

      {data && (
        <div className="mt-4 sm:mt-6 flex items-center justify-between gap-2 text-xs sm:text-sm text-white/60">
          <button
            onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
            disabled={page === 1}
            className="rounded-full border border-white/10 px-2.5 sm:px-3 md:px-4 py-1.5 sm:py-2 text-[10px] sm:text-xs md:text-sm transition hover:border-white/30 disabled:opacity-30 active:scale-95 touch-manipulation"
          >
            {tPagination("previous")}
          </button>
          <motion.span
            key={page}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-white text-[10px] sm:text-xs md:text-sm text-center min-w-[80px] sm:min-w-[100px]"
          >
            {tPagination("page")} {page} {tPagination("of")} {data.meta.totalPages}
          </motion.span>
          <button
            onClick={() => setPage((prev) => Math.min(prev + 1, data.meta.totalPages))}
            disabled={page >= data.meta.totalPages}
            className="rounded-full border border-white/10 px-2.5 sm:px-3 md:px-4 py-1.5 sm:py-2 text-[10px] sm:text-xs md:text-sm transition hover:border-white/30 disabled:opacity-30 active:scale-95 touch-manipulation"
          >
            {tPagination("next")}
          </button>
        </div>
      )}

      {/* Full Message Modal */}
      <Modal
        open={Boolean(selectedMessage)}
        onClose={() => setSelectedMessage(null)}
        title={
          selectedMessage
            ? `${tFeedback("messageFrom") || "Message from"} ${selectedMessage.name}`
            : ""
        }
      >
        {selectedMessage && (
          <div className="space-y-6">
            {/* Message Details */}
            <div className="space-y-4">
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-semibold text-white/60 mb-1">
                      {tFeedback("name")}
                    </h3>
                    <p className="text-lg font-medium text-white">{selectedMessage.name}</p>
                  </div>
                  <button
                    onClick={() => handleToggleRead(selectedMessage.id, selectedMessage.read)}
                    className={`p-2 rounded-full transition ${
                      selectedMessage.read
                        ? "bg-green-500/20 text-green-400 hover:bg-green-500/30"
                        : "bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30"
                    }`}
                    title={selectedMessage.read ? tFeedback("markUnread") : tFeedback("markRead")}
                  >
                    {selectedMessage.read ? (
                      <Check className="h-5 w-5" />
                    ) : (
                      <Mail className="h-5 w-5" />
                    )}
                  </button>
                </div>

                <div className="mb-4">
                  <h3 className="text-sm font-semibold text-white/60 mb-1">{tFeedback("email")}</h3>
                  <a
                    href={`mailto:${selectedMessage.email}`}
                    className="text-base text-luxury-gold hover:text-luxury-lightGold transition-colors break-all"
                  >
                    {selectedMessage.email}
                  </a>
                </div>

                <div className="mb-4">
                  <h3 className="text-sm font-semibold text-white/60 mb-1">{tFeedback("date")}</h3>
                  <p className="text-base text-white/80">
                    {new Date(selectedMessage.createdAt).toLocaleString()}
                  </p>
                </div>
              </div>

              {/* Full Message */}
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
                <h3 className="text-sm font-semibold text-white/60 mb-3">{tFeedback("message")}</h3>
                <div className="text-base text-white/90 leading-relaxed whitespace-pre-wrap break-words">
                  {selectedMessage.message}
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-center">
              <motion.button
                onClick={() => setSelectedMessage(null)}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="w-full sm:w-auto min-w-[120px] rounded-xl border border-white/15 bg-white/5 px-5 py-3 text-sm font-medium text-white transition hover:bg-white/10"
              >
                {tFeedback("close") || "Close"}
              </motion.button>
            </div>
          </div>
        )}
      </Modal>
    </AnimatedCard>
  );
}
