"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Modal } from "./Modal";
import {
  Trash2,
  AlertTriangle,
  Search,
  X,
  History,
  RotateCcw,
  Clock3,
  RefreshCw,
} from "lucide-react";
import { useDownload } from "@/contexts/DownloadContext";

type ProductRow = {
  id: number;
  name: string;
  weight: number;
  serialCode: string;
  price?: number | null;
  stock?: number | null;
  createdAt: string;
  qrRecord?: {
    qrImageUrl: string;
    scanCount: number;
  } | null;
};

type DeletedHistoryItem = {
  id: number;
  productId: number;
  name: string;
  weight: number;
  serialCode: string;
  price?: number | null;
  stock?: number | null;
  qrImageUrl?: string | null;
  scanCount?: number | null;
  deletedAt: string;
  deletedBy?: string | null;
  restoredAt?: string | null;
};

type DeletedBatch = {
  id: number;
  deletedAt: string;
  deletedBy?: string | null;
  itemCount: number;
  histories: DeletedHistoryItem[];
};

export function ProductTable({ products }: { products: ProductRow[] }) {
  const t = useTranslations("admin.productsDetail");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [showDeleteAllModal, setShowDeleteAllModal] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [isDeletingAll, setIsDeletingAll] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [historyBatches, setHistoryBatches] = useState<DeletedBatch[]>([]);
  const [restoringId, setRestoringId] = useState<number | null>(null);
  const [restoringBatchId, setRestoringBatchId] = useState<number | null>(null);
  const [cleaningHistory, setCleaningHistory] = useState(false);
  const [deletingHistoryId, setDeletingHistoryId] = useState<number | null>(null);

  const { setDownloadPercent, setDownloadLabel, setIsDownloadMinimized } = useDownload();

  // Filter products based on search query
  const filteredProducts = useMemo(() => {
    if (!searchQuery.trim()) {
      return products;
    }

    const query = searchQuery.toLowerCase().trim();
    return products.filter((product) => {
      const nameMatch = product.name.toLowerCase().includes(query);
      const serialMatch = product.serialCode.toLowerCase().includes(query);
      const weightMatch = product.weight.toString().includes(query);

      return nameMatch || serialMatch || weightMatch;
    });
  }, [products, searchQuery]);

  async function handleDelete(id: number) {
    const product = products.find((p) => p.id === id);
    const productName = product?.name || t("product");

    setDeletingId(id);
    try {
      const res = await fetch(`/api/products/delete/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || t("deleteFailed"));
      }

      toast.success(t("deleteSuccess"), {
        description: `${productName} has been removed from inventory`,
        duration: 3000,
      });

      startTransition(() => router.refresh());
    } catch (error: any) {
      console.error(error);
      toast.error(t("deleteFailed"), {
        description: error.message || t("tryAgain"),
        duration: 4000,
      });
    } finally {
      setDeletingId(null);
    }
  }

  async function handleDeleteAll() {
    if (products.length === 0) {
      toast.info(t("noProducts"));
      return;
    }

    // First confirmation: Show warning modal
    setShowDeleteAllModal(true);
  }

  async function confirmDeleteAll() {
    // Second confirmation: Require typing "DELETE ALL"
    if (confirmText !== "DELETE ALL") {
      toast.error(t("typeToConfirm"), {
        description: t("safetyMeasure"),
        duration: 4000,
      });
      return;
    }

    setIsDeletingAll(true);
    setShowConfirmModal(false);
    setShowDeleteAllModal(false);

    try {
      const res = await fetch("/api/products/delete-all", { method: "DELETE" });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || errorData.message || t("deleteAllFailed"));
      }

      const data = await res.json();

      toast.success(t("deleteAllSuccess"), {
        description: t("deleteAllSuccessDescription", {
          count: data.deletedCount || products.length,
        }),
        duration: 5000,
      });

      // Reset confirmation text
      setConfirmText("");

      // Refresh the page to show empty state
      startTransition(() => router.refresh());
    } catch (error: any) {
      console.error(error);
      toast.error(t("deleteAllFailed"), {
        description: error.message || t("tryAgain"),
        duration: 5000,
      });
    } finally {
      setIsDeletingAll(false);
    }
  }

  function handleFirstConfirm() {
    setShowDeleteAllModal(false);
    setShowConfirmModal(true);
  }

  async function loadDeleteHistory() {
    setHistoryLoading(true);
    setHistoryError(null);
    try {
      const res = await fetch("/api/products/deleted");
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || t("historyLoadFailed"));
      }
      const data = await res.json();
      setHistoryBatches(data.batches || []);
    } catch (error: any) {
      console.error(error);
      setHistoryError(error.message || t("historyLoadFailed"));
    } finally {
      setHistoryLoading(false);
    }
  }

  useEffect(() => {
    if (showHistoryModal) {
      loadDeleteHistory();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showHistoryModal]);

  async function handleRestore(historyId: number) {
    setRestoringId(historyId);
    setDownloadPercent(10);
    setDownloadLabel(t("restoreProgressStart"));
    setIsDownloadMinimized(false);

    try {
      const res = await fetch(`/api/products/restore/${historyId}`, { method: "POST" });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || errorData.message || t("restoreFailed"));
      }

      setDownloadPercent(70);
      setDownloadLabel(t("restoreProgressFinish"));

      const data = await res.json();
      toast.success(t("restoreSuccess"), {
        description: t("restoreSuccessDescription", { name: data.product?.name || t("product") }),
        duration: 3500,
      });

      await loadDeleteHistory();
      startTransition(() => router.refresh());

      setDownloadPercent(100);
      setDownloadLabel(t("restoreComplete"));
      setTimeout(() => {
        setDownloadPercent(null);
        setDownloadLabel("");
        setIsDownloadMinimized(false);
      }, 800);
    } catch (error: any) {
      console.error(error);
      toast.error(t("restoreFailed"), {
        description: error.message || t("tryAgain"),
      });
      setDownloadPercent(null);
      setDownloadLabel("");
      setIsDownloadMinimized(false);
    } finally {
      setRestoringId(null);
    }
  }

  async function handleRestoreBatch(batchId: number, itemCount: number) {
    setRestoringBatchId(batchId);
    setDownloadPercent(5);
    setDownloadLabel(t("restoreBatchProgressStart", { count: itemCount }));
    setIsDownloadMinimized(false);

    try {
      const res = await fetch(`/api/products/restore-batch/${batchId}`, { method: "POST" });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || errorData.message || t("restoreFailed"));
      }

      setDownloadPercent(75);
      setDownloadLabel(t("restoreProgressFinish"));

      const data = await res.json();
      toast.success(t("restoreBatchSuccess"), {
        description: t("restoreBatchSuccessDescription", {
          count: data.restoredCount ?? itemCount,
        }),
        duration: 4000,
      });

      await loadDeleteHistory();
      startTransition(() => router.refresh());

      setDownloadPercent(100);
      setDownloadLabel(t("restoreComplete"));
      setTimeout(() => {
        setDownloadPercent(null);
        setDownloadLabel("");
        setIsDownloadMinimized(false);
      }, 800);
    } catch (error: any) {
      console.error(error);
      toast.error(t("restoreFailed"), {
        description: error.message || t("tryAgain"),
      });
      setDownloadPercent(null);
      setDownloadLabel("");
      setIsDownloadMinimized(false);
    } finally {
      setRestoringBatchId(null);
    }
  }

  async function handleDeleteHistory(id: number) {
    setDeletingHistoryId(id);
    try {
      const res = await fetch(`/api/products/deleted/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || t("historyDeleteFailed"));
      }
      toast.success(t("historyDeleteSuccess"));
      await loadDeleteHistory();
    } catch (error: any) {
      toast.error(t("historyDeleteFailed"), { description: error.message || t("tryAgain") });
    } finally {
      setDeletingHistoryId(null);
    }
  }

  async function handleCleanupHistory() {
    setCleaningHistory(true);
    try {
      const res = await fetch("/api/products/deleted/cleanup", {
        method: "POST",
        body: JSON.stringify({}),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || t("historyCleanupFailed"));
      }
      const data = await res.json();
      toast.success(t("historyCleanupSuccess"), {
        description: t("historyCleanupDescription", { count: data.deletedCount ?? 0 }),
      });
      await loadDeleteHistory();
    } catch (error: any) {
      toast.error(t("historyCleanupFailed"), { description: error.message || t("tryAgain") });
    } finally {
      setCleaningHistory(false);
    }
  }

  return (
    <>
      {/* Search Bar and Actions */}
      <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        {/* Search Bar */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t("searchPlaceholder")}
            className="w-full rounded-full border border-white/15 bg-white/5 px-10 py-2 text-sm text-white placeholder:text-white/40 focus:border-[#FFD700] focus:outline-none focus:ring-2 focus:ring-[#FFD700]/20"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-white/40 hover:text-white transition"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setShowHistoryModal(true)}
            className="flex items-center gap-2 rounded-full border border-white/20 bg-white/5 px-4 py-2 text-sm font-medium text-white/80 transition hover:border-white/40 hover:bg-white/10"
          >
            <History className="h-4 w-4" />
            {t("viewDeleteHistory")}
          </button>
          <button
            onClick={handleDeleteAll}
            disabled={isDeletingAll || products.length === 0}
            className="flex items-center gap-2 rounded-full border border-red-400/40 bg-red-500/10 px-4 py-2 text-sm font-medium text-red-300 transition hover:border-red-400 hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Trash2 className="h-4 w-4" />
            {isDeletingAll ? t("deletingAll") : t("deleteAllProducts")}
          </button>
        </div>
      </div>

      {/* Search Results Count */}
      {searchQuery && (
        <div className="mb-4 text-sm text-white/60">
          {t("found")} {filteredProducts.length} {t("of")} {products.length} {t("product")}
        </div>
      )}

      {/* First Confirmation Modal - Warning */}
      <Modal
        open={showDeleteAllModal}
        onClose={() => {
          setShowDeleteAllModal(false);
        }}
        title={t("deleteAllWarningTitle")}
      >
        <div className="space-y-6">
          <div className="flex items-start gap-4 rounded-2xl border border-red-500/30 bg-red-500/10 p-4">
            <AlertTriangle className="h-6 w-6 flex-shrink-0 text-red-400" />
            <div className="space-y-2">
              <p className="font-semibold text-red-300">{t("deleteAllWarningText")}</p>
              <p className="text-sm text-white/70">
                {t("deleteAllWarningDescription", { count: products.length })}
              </p>
              <ul className="ml-4 list-disc space-y-1 text-sm text-white/60">
                <li>{t("deleteAllWarningItem1")}</li>
                <li>{t("deleteAllWarningItem2")}</li>
                <li>{t("deleteAllWarningItem3")}</li>
              </ul>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => setShowDeleteAllModal(false)}
              className="flex-1 rounded-full border border-white/15 bg-white/5 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/10"
            >
              {t("cancel")}
            </button>
            <button
              onClick={handleFirstConfirm}
              className="flex-1 rounded-full border border-red-400/40 bg-red-500/20 px-4 py-2 text-sm font-medium text-red-300 transition hover:bg-red-500/30"
            >
              {t("continue")}
            </button>
          </div>
        </div>
      </Modal>

      {/* Second Confirmation Modal - Type to Confirm */}
      <Modal
        open={showConfirmModal}
        onClose={() => {
          setShowConfirmModal(false);
          setConfirmText("");
        }}
        title={t("finalConfirmationTitle")}
      >
        <div className="space-y-6">
          <div className="space-y-2">
            <p className="text-sm text-white/70">{t("finalConfirmationText")}</p>
            <input
              type="text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder={t("typeToConfirmPlaceholder")}
              className="w-full rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-white placeholder:text-white/40 focus:border-[#FFD700] focus:outline-none focus:ring-2 focus:ring-[#FFD700]/20"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter" && confirmText === "DELETE ALL") {
                  confirmDeleteAll();
                }
              }}
            />
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => {
                setShowConfirmModal(false);
                setConfirmText("");
              }}
              className="flex-1 rounded-full border border-white/15 bg-white/5 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/10"
            >
              {t("cancel")}
            </button>
            <button
              onClick={confirmDeleteAll}
              disabled={confirmText !== "DELETE ALL"}
              className="flex-1 rounded-full border border-red-400/40 bg-red-500/20 px-4 py-2 text-sm font-medium text-red-300 transition hover:bg-red-500/30 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {t("deleteAllProducts")}
            </button>
          </div>
        </div>
      </Modal>

      {/* Delete History Modal */}
      <Modal
        open={showHistoryModal}
        onClose={() => setShowHistoryModal(false)}
        title={t("deleteHistoryTitle")}
      >
        <div className="space-y-4">
          <p className="text-sm text-white/60">{t("deleteHistoryDescription")}</p>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={loadDeleteHistory}
              className="rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-xs text-white hover:border-white/40 inline-flex items-center gap-2"
              aria-label={t("refresh")}
            >
              <RefreshCw className="h-4 w-4" />
            </button>
            <button
              onClick={handleCleanupHistory}
              disabled={cleaningHistory}
              className="flex items-center gap-2 rounded-full border border-amber-400/40 bg-amber-500/10 px-3 py-1.5 text-xs font-semibold text-amber-200 transition hover:border-amber-400 disabled:opacity-50"
            >
              <Trash2 className="h-4 w-4" />
              {cleaningHistory ? t("cleaningHistory") : t("cleanupHistory")}
            </button>
          </div>

          {historyLoading && (
            <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/70">
              <Clock3 className="h-4 w-4 animate-spin text-white/60" />
              {t("loadingHistory")}
            </div>
          )}

          {historyError && (
            <div className="space-y-2 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">
              <p>{historyError}</p>
              <button
                onClick={loadDeleteHistory}
                className="rounded-full border border-white/20 px-3 py-1 text-xs text-white hover:border-white/40"
              >
                {t("tryAgain")}
              </button>
            </div>
          )}

          {!historyLoading && !historyError && historyBatches.length === 0 && (
            <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-6 text-center text-sm text-white/60">
              {t("noDeleteHistory")}
            </div>
          )}

          {!historyLoading && !historyError && historyBatches.length > 0 && (
            <div className="space-y-4 max-h-[480px] overflow-y-auto pr-1">
              {historyBatches.map((batch) => {
                const batchRestoring = restoringBatchId === batch.id;
                const allRestored = batch.histories.every((h) => !!h.restoredAt);
                return (
                  <div
                    key={batch.id}
                    className="rounded-2xl border border-white/10 bg-white/5 p-4 space-y-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-white font-semibold">
                          {t("batchLabel", { count: batch.itemCount })}
                        </p>
                        <p className="text-xs text-white/50">
                          {t("deletedAtLabel")}: {new Date(batch.deletedAt).toLocaleString()}
                        </p>
                        {batch.deletedBy && (
                          <p className="text-xs text-white/50">
                            {t("deletedByLabel")}: {batch.deletedBy}
                          </p>
                        )}
                      </div>
                      <button
                        disabled={batchRestoring || allRestored}
                        onClick={() => handleRestoreBatch(batch.id, batch.histories.length)}
                        className="flex items-center gap-2 rounded-full border border-green-400/40 bg-green-500/10 px-3 py-1.5 text-xs font-semibold text-green-200 transition hover:border-green-400 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <RotateCcw className="h-4 w-4" />
                        {batchRestoring
                          ? t("restoring")
                          : allRestored
                            ? t("restored")
                            : t("restoreBatch")}
                      </button>
                    </div>

                    <div className="space-y-2">
                      {batch.histories.map((item) => {
                        const isRestored = !!item.restoredAt;
                        const isRestoring = restoringId === item.id;
                        return (
                          <div
                            key={item.id}
                            className="rounded-xl border border-white/10 bg-black/20 p-3 space-y-2"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <p className="text-white font-semibold">{item.name}</p>
                                <p className="text-xs text-white/50 font-mono">{item.serialCode}</p>
                              </div>
                              <div className="text-right text-xs text-white/60">
                                <p>{t("deletedAtLabel")}</p>
                                <p className="text-white/80">
                                  {new Date(item.deletedAt).toLocaleString()}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-white/70 flex-wrap">
                              <span className="rounded-full border border-white/10 px-2 py-1 text-xs">
                                {item.weight} gr
                              </span>
                              {typeof item.stock === "number" && (
                                <span className="rounded-full border border-white/10 px-2 py-1 text-xs">
                                  {t("stock")}: {item.stock}
                                </span>
                              )}
                              {typeof item.price === "number" && (
                                <span className="rounded-full border border-white/10 px-2 py-1 text-xs">
                                  {t("price")}: {item.price}
                                </span>
                              )}
                              <span className="text-xs text-white/60">
                                {item.scanCount ?? 0} {t("scans")}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                disabled={isRestoring || isRestored}
                                onClick={() => handleRestore(item.id)}
                                className="flex items-center gap-2 rounded-full border border-green-400/40 bg-green-500/10 px-3 py-1.5 text-xs font-semibold text-green-200 transition hover:border-green-400 disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                <RotateCcw className="h-4 w-4" />
                                {isRestored
                                  ? t("restored")
                                  : isRestoring
                                    ? t("restoring")
                                    : t("restore")}
                              </button>
                              <button
                                disabled={deletingHistoryId === item.id}
                                onClick={() => handleDeleteHistory(item.id)}
                                className="flex items-center gap-2 rounded-full border border-red-400/40 bg-red-500/10 px-3 py-1.5 text-xs font-semibold text-red-200 transition hover:border-red-400 disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                <Trash2 className="h-4 w-4" />
                                {deletingHistoryId === item.id
                                  ? t("deleting")
                                  : t("deleteHistoryItem")}
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </Modal>

      <div className="overflow-hidden rounded-3xl border border-white/5 bg-white/[0.02]">
        {/* Desktop Table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-sm text-white/70">
            <thead>
              <tr className="bg-white/[0.03] text-left text-xs uppercase tracking-[0.4em] text-white/40">
                <th className="px-4 lg:px-6 py-4">{t("name")}</th>
                <th className="px-4 lg:px-6 py-4">{t("serial")}</th>
                <th className="px-4 lg:px-6 py-4">{t("weight")}</th>
                <th className="px-4 lg:px-6 py-4">{t("scans")}</th>
                <th className="px-4 lg:px-6 py-4 text-right">{t("actions")}</th>
              </tr>
            </thead>
            <tbody>
              {filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-white/40">
                    {searchQuery ? t("noProducts") : t("noProducts")}
                  </td>
                </tr>
              ) : (
                filteredProducts.map((product) => (
                  <tr key={product.id} className="border-t border-white/5">
                    <td className="px-4 lg:px-6 py-4">
                      <p className="font-semibold text-white">{product.name}</p>
                      <p className="text-xs text-white/40">#{product.id}</p>
                    </td>
                    <td className="px-4 lg:px-6 py-4 font-mono text-sm text-white/80">
                      {product.serialCode}
                    </td>
                    <td className="px-4 lg:px-6 py-4">{product.weight} gr</td>
                    <td className="px-4 lg:px-6 py-4">{product.qrRecord?.scanCount ?? 0}</td>
                    <td className="px-4 lg:px-6 py-4 text-right">
                      <button
                        onClick={() => router.push(`/admin/products/create?id=${product.id}`)}
                        className="mr-3 rounded-full border border-white/15 px-3 py-1 text-xs text-white/70 hover:border-white/40"
                      >
                        {t("editProduct")}
                      </button>
                      <button
                        disabled={isPending && deletingId === product.id}
                        onClick={() => handleDelete(product.id)}
                        className="rounded-full border border-red-400/40 px-3 py-1 text-xs text-red-300 hover:border-red-400"
                      >
                        {isPending && deletingId === product.id
                          ? t("deleting")
                          : t("deleteProduct")}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Cards */}
        <div className="md:hidden divide-y divide-white/5">
          {filteredProducts.length === 0 ? (
            <div className="px-4 py-12 text-center text-white/40 text-sm">
              {searchQuery ? t("noProductsMatching") : t("noProducts")}
            </div>
          ) : (
            filteredProducts.map((product) => (
              <div
                key={product.id}
                className="p-3 sm:p-4 space-y-3 active:bg-white/5 transition-colors"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-white text-sm sm:text-base truncate">
                      {product.name}
                    </p>
                    <p className="text-[10px] sm:text-xs text-white/40 mt-0.5 sm:mt-1">
                      #{product.id}
                    </p>
                  </div>
                  <div className="flex gap-1.5 sm:gap-2 flex-shrink-0">
                    <button
                      onClick={() => router.push(`/admin/products/create?id=${product.id}`)}
                      className="rounded-full border border-white/15 px-2.5 sm:px-3 py-1.5 text-[10px] sm:text-xs text-white/70 hover:border-white/40 active:scale-95 touch-manipulation transition-transform"
                    >
                      {t("editProduct")}
                    </button>
                    <button
                      disabled={isPending && deletingId === product.id}
                      onClick={() => handleDelete(product.id)}
                      className="rounded-full border border-red-400/40 px-2.5 sm:px-3 py-1.5 text-[10px] sm:text-xs text-red-300 hover:border-red-400 disabled:opacity-50 active:scale-95 touch-manipulation transition-transform"
                    >
                      {isPending && deletingId === product.id ? t("deleting") : t("deleteProduct")}
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 sm:gap-3 text-xs sm:text-sm">
                  <div>
                    <p className="text-white/40 text-[10px] sm:text-xs uppercase tracking-wide mb-1">
                      {t("serial")}
                    </p>
                    <p className="font-mono text-white/80 text-xs sm:text-sm break-all">
                      {product.serialCode}
                    </p>
                  </div>
                  <div>
                    <p className="text-white/40 text-[10px] sm:text-xs uppercase tracking-wide mb-1">
                      {t("weight")}
                    </p>
                    <p className="text-white/80 text-xs sm:text-sm">{product.weight} gr</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-white/40 text-[10px] sm:text-xs uppercase tracking-wide mb-1">
                      {t("scans")}
                    </p>
                    <p className="text-white/80 text-xs sm:text-sm">
                      {product.qrRecord?.scanCount ?? 0}
                    </p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </>
  );
}
