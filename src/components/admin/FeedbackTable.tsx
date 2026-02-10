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
        title=""
      >
        {selectedMessage && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.1 }}
            className="space-y-6"
          >
            {/* Custom Header with Status Badge */}
            <div className="flex items-start justify-between gap-4 pb-4 border-b border-white/10">
              <div className="flex-1">
                <h2 className="text-2xl font-bold text-white mb-2">
                  {tFeedback("messageFrom") || "Message from"} {selectedMessage.name}
                </h2>
                <div className="flex items-center gap-3">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.2, type: "spring" }}
                    className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${
                      selectedMessage.read
                        ? "bg-green-500/20 text-green-400 border border-green-500/30"
                        : "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 animate-pulse"
                    }`}
                  >
                    {selectedMessage.read ? (
                      <>
                        <Check className="h-3 w-3" />
                        <span>Read</span>
                      </>
                    ) : (
                      <>
                        <Mail className="h-3 w-3" />
                        <span>Unread</span>
                      </>
                    )}
                  </motion.div>
                  <motion.button
                    onClick={() => handleToggleRead(selectedMessage.id, selectedMessage.read)}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className={`p-2 rounded-lg transition-all ${
                      selectedMessage.read
                        ? "bg-green-500/10 text-green-400 hover:bg-green-500/20 border border-green-500/20"
                        : "bg-yellow-500/10 text-yellow-400 hover:bg-yellow-500/20 border border-yellow-500/20"
                    }`}
                    title={selectedMessage.read ? tFeedback("markUnread") : tFeedback("markRead")}
                  >
                    {selectedMessage.read ? (
                      <Mail className="h-4 w-4" />
                    ) : (
                      <Check className="h-4 w-4" />
                    )}
                  </motion.button>
                </div>
              </div>
            </div>

            {/* Sender Information Grid */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.15 }}
              className="grid grid-cols-1 md:grid-cols-2 gap-4"
            >
              {/* Name Card */}
              <div className="rounded-xl border border-white/10 bg-gradient-to-br from-white/[0.08] via-white/[0.04] to-transparent p-4 backdrop-blur-sm hover:border-white/20 transition-colors">
                <p className="text-[10px] uppercase tracking-[0.15em] text-white/50 mb-2 font-semibold">
                  {tFeedback("name")}
                </p>
                <p className="text-lg font-bold text-white">{selectedMessage.name}</p>
              </div>

              {/* Date Card */}
              <div className="rounded-xl border border-white/10 bg-gradient-to-br from-white/[0.08] via-white/[0.04] to-transparent p-4 backdrop-blur-sm hover:border-white/20 transition-colors">
                <p className="text-[10px] uppercase tracking-[0.15em] text-white/50 mb-2 font-semibold">
                  {tFeedback("date")}
                </p>
                <p className="text-sm text-white/90 font-mono">
                  {new Date(selectedMessage.createdAt).toLocaleString("id-ID", {
                    weekday: "long",
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </div>
            </motion.div>

            {/* Email Card - Full Width */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.2 }}
              className="rounded-xl border border-white/10 bg-gradient-to-br from-white/[0.08] via-white/[0.04] to-transparent p-4 backdrop-blur-sm hover:border-[#FFD700]/30 transition-colors"
            >
              <p className="text-[10px] uppercase tracking-[0.15em] text-white/50 mb-2 font-semibold">
                {tFeedback("email")}
              </p>
              <a
                href={`mailto:${selectedMessage.email}`}
                className="inline-flex items-center gap-2 text-base text-[#FFD700] hover:text-[#FFD700]/80 transition-all break-all font-semibold group"
              >
                <div className="p-1.5 rounded-lg bg-[#FFD700]/10 group-hover:bg-[#FFD700]/20 transition-colors">
                  <Mail className="h-4 w-4 group-hover:scale-110 transition-transform" />
                </div>
                <span className="break-all">{selectedMessage.email}</span>
              </a>
            </motion.div>

            {/* Message Content Card */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.25 }}
              className="rounded-xl border border-white/10 bg-gradient-to-br from-white/[0.08] via-white/[0.04] to-transparent p-6 backdrop-blur-sm"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="h-px flex-1 bg-gradient-to-r from-transparent via-white/20 to-transparent" />
                <p className="text-[10px] uppercase tracking-[0.2em] text-white/50 font-semibold px-3">
                  {tFeedback("message")}
                </p>
                <div className="h-px flex-1 bg-gradient-to-r from-transparent via-white/20 to-transparent" />
              </div>
              <div className="text-[15px] text-white/95 leading-relaxed whitespace-pre-wrap break-words font-light bg-white/5 rounded-lg p-4 border border-white/5">
                {selectedMessage.message}
              </div>
            </motion.div>

            {/* Action Buttons */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.3 }}
              className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-3 pt-4 border-t border-white/10"
            >
              <motion.a
                href={`mailto:${selectedMessage.email}?subject=Re: ${encodeURIComponent(selectedMessage.name)}`}
                whileHover={{ scale: 1.02, y: -1 }}
                whileTap={{ scale: 0.98 }}
                className="inline-flex items-center justify-center gap-2 rounded-xl border-2 border-[#FFD700]/50 bg-[#FFD700]/10 px-6 py-3 text-sm font-semibold text-[#FFD700] transition-all hover:border-[#FFD700] hover:bg-[#FFD700]/20 hover:shadow-[0_4px_12px_rgba(255,215,0,0.2)]"
              >
                <Mail className="h-4 w-4" />
                {tFeedback("reply") || "Reply"}
              </motion.a>
              <motion.button
                onClick={() => setSelectedMessage(null)}
                whileHover={{ scale: 1.02, y: -1 }}
                whileTap={{ scale: 0.98 }}
                className="inline-flex items-center justify-center rounded-xl border-2 border-white/20 bg-white/5 px-6 py-3 text-sm font-semibold text-white transition-all hover:border-white/40 hover:bg-white/10 hover:shadow-[0_4px_12px_rgba(255,255,255,0.1)]"
              >
                {tFeedback("close") || "Close"}
              </motion.button>
            </motion.div>
          </motion.div>
        )}
      </Modal>
    </AnimatedCard>
  );
}
