"use client";

import { useMemo, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { Search, X, Filter, Trash2, Pencil, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { Modal } from "./Modal";

type GramBatchRow = {
  id: number;
  name: string;
  weight: number;
  quantity: number;
  qrMode: string;
  weightGroup: string | null;
  createdAt: string;
  qrCount: number;
};

type Props = {
  batches: GramBatchRow[];
  onMutate?: () => void;
};

export function GramProductTable({ batches }: Props) {
  const t = useTranslations("admin.productsDetail");
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [weightFilter, setWeightFilter] = useState<"ALL" | "SMALL" | "LARGE">("ALL");
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const [showDeleteAllModal, setShowDeleteAllModal] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [isDeletingAll, setIsDeletingAll] = useState(false);
  const [isPending, startTransition] = useTransition();

  const filteredBatches = useMemo(() => {
    let result = batches;

    if (weightFilter !== "ALL") {
      result = result.filter(
        (b) => (b.weightGroup || "").toUpperCase() === weightFilter.toUpperCase()
      );
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter((b) => {
        const nameMatch = b.name.toLowerCase().includes(q);
        const weightMatch = b.weight.toString().includes(q);
        return nameMatch || weightMatch;
      });
    }

    return result;
  }, [batches, searchQuery, weightFilter]);

  const getModeLabel = (batch: GramBatchRow) => {
    if (batch.qrMode === "SINGLE_QR" || batch.weight < 100) {
      return "1 QR (small weight)";
    }
    return "Per-unit QR (large weight)";
  };

  async function handleDelete(batch: GramBatchRow) {
    if (!window.confirm(`Hapus batch "${batch.name}"? Semua QR dan log scan akan dihapus.`)) {
      return;
    }

    setDeletingId(batch.id);
    try {
      const res = await fetch(`/api/gram-products/batch/${batch.id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Gagal menghapus batch");
      }

      toast.success("Batch dihapus", {
        description: `Batch "${batch.name}" telah dihapus.`,
      });

      startTransition(() => {
        router.refresh();
      });
    } catch (error: any) {
      console.error("[GramProductTable] delete error:", error);
      toast.error("Gagal menghapus batch", {
        description: error?.message || "Terjadi kesalahan saat menghapus batch.",
      });
    } finally {
      setDeletingId(null);
    }
  }

  function handleEdit(batch: GramBatchRow) {
    // Sama seperti Products Page 1: buka halaman form edit dengan query id
    router.push(`/admin/products/page2/edit?id=${batch.id}`);
  }

  function handleFirstConfirm() {
    setShowDeleteAllModal(false);
    setShowConfirmModal(true);
  }

  async function confirmDeleteAll() {
    if (confirmText !== "DELETE ALL") {
      toast.error("Ketik \"DELETE ALL\" untuk menghapus semua produk.");
      return;
    }

    setIsDeletingAll(true);
    try {
      const res = await fetch("/api/gram-products/delete-all", { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Gagal menghapus semua produk.");
      }
      const data = await res.json().catch(() => ({}));
      const deletedCount = data.deletedBatches ?? batches.length;

      toast.success("Semua produk dihapus", {
        description: `${deletedCount} batch dan QR terkait telah dihapus.`,
      });
      setShowConfirmModal(false);
      setConfirmText("");
      startTransition(() => {
        router.refresh();
      });
    } catch (error: any) {
      console.error("[GramProductTable] delete-all error:", error);
      toast.error("Gagal menghapus semua produk", {
        description: error?.message || "Terjadi kesalahan saat menghapus semua produk.",
      });
    } finally {
      setIsDeletingAll(false);
    }
  }

  return (
    <>
      {/* Search + Filter */}
      <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
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
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1 text-xs text-white/60">
            <Filter className="h-3 w-3" />
            Mode
          </span>
          <div className="flex rounded-full border border-white/15 bg-white/5 p-1 text-xs">
            <button
              onClick={() => setWeightFilter("ALL")}
              className={`px-3 py-1 rounded-full ${
                weightFilter === "ALL" ? "bg-white text-black" : "text-white/70"
              }`}
            >
              All
            </button>
            <button
              onClick={() => setWeightFilter("SMALL")}
              className={`px-3 py-1 rounded-full ${
                weightFilter === "SMALL" ? "bg-white text-black" : "text-white/70"
              }`}
            >
              ≤ 100gr (1 QR)
            </button>
            <button
              onClick={() => setWeightFilter("LARGE")}
              className={`px-3 py-1 rounded-full ${
                weightFilter === "LARGE" ? "bg-white text-black" : "text-white/70"
              }`}
            >
              ≥ 250gr (multi QR)
            </button>
          </div>
        </div>
      </div>

      {/* Delete All Button (same UX as Page 1) */}
      <div className="mb-4 flex justify-end">
        <button
          onClick={() => setShowDeleteAllModal(true)}
          disabled={isDeletingAll || batches.length === 0}
          className="flex items-center gap-2 rounded-full border border-red-400/40 bg-red-500/10 px-4 py-2 text-sm font-medium text-red-300 transition hover:border-red-400 hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Trash2 className="h-4 w-4" />
          {isDeletingAll ? t("deletingAll") : t("deleteAllProducts")}
        </button>
      </div>

      {/* First Confirmation Modal */}
      <Modal
        open={showDeleteAllModal}
        onClose={() => setShowDeleteAllModal(false)}
        title={t("deleteAllWarningTitle")}
      >
        <div className="space-y-6">
          <div className="flex items-start gap-4 rounded-2xl border border-red-500/30 bg-red-500/10 p-4">
            <AlertTriangle className="h-6 w-6 flex-shrink-0 text-red-400" />
            <div className="space-y-2">
              <p className="font-semibold text-red-300">{t("deleteAllWarningText")}</p>
              <p className="text-sm text-white/70">
                {t("deleteAllWarningDescription", { count: batches.length })}
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

      {/* Second Confirmation Modal */}
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
              disabled={confirmText !== "DELETE ALL" || isDeletingAll}
              className="flex-1 rounded-full border border-red-400/40 bg-red-500/20 px-4 py-2 text-sm font-medium text-red-300 transition hover:bg-red-500/30 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {t("deleteAllProducts")}
            </button>
          </div>
        </div>
      </Modal>

      {/* Table */}
      <div className="overflow-hidden rounded-3xl border border-white/5 bg-white/[0.02]">
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-sm text-white/70">
            <thead>
              <tr className="bg-white/[0.03] text-left text-xs uppercase tracking-[0.4em] text-white/40">
                <th className="px-4 lg:px-6 py-4">{t("name")}</th>
                <th className="px-4 lg:px-6 py-4">Weight</th>
                <th className="px-4 lg:px-6 py-4">Quantity</th>
                <th className="px-4 lg:px-6 py-4">QR Count</th>
                <th className="px-4 lg:px-6 py-4">QR Mode</th>
                <th className="px-4 lg:px-6 py-4">Created</th>
                <th className="px-4 lg:px-6 py-4 text-right">{t("actions")}</th>
              </tr>
            </thead>
            <tbody>
              {filteredBatches.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-white/40">
                    {t("noProducts")}
                  </td>
                </tr>
              ) : (
                filteredBatches.map((batch) => (
                  <tr key={batch.id} className="border-t border-white/5">
                    <td className="px-4 lg:px-6 py-4">
                      <p className="font-semibold text-white">{batch.name}</p>
                      <p className="text-xs text-white/40">Batch #{batch.id}</p>
                    </td>
                    <td className="px-4 lg:px-6 py-4">{batch.weight} gr</td>
                    <td className="px-4 lg:px-6 py-4">{batch.quantity}</td>
                    <td className="px-4 lg:px-6 py-4">{batch.qrCount}</td>
                    <td className="px-4 lg:px-6 py-4">{getModeLabel(batch)}</td>
                    <td className="px-4 lg:px-6 py-4">
                      {new Date(batch.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 lg:px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => handleEdit(batch)}
                          className="inline-flex items-center gap-1 rounded-full border border-white/20 px-3 py-1 text-[11px] text-white/80 hover:border-white/50"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                          {t("editProduct")}
                        </button>
                        <button
                          onClick={() => handleDelete(batch)}
                          disabled={isPending && deletingId === batch.id}
                          className="inline-flex items-center gap-1 rounded-full border border-red-400/40 px-3 py-1 text-[11px] text-red-300 hover:border-red-400 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          {deletingId === batch.id ? t("deleting") : t("deleteProduct")}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile cards */}
        <div className="md:hidden divide-y divide-white/5">
          {filteredBatches.length === 0 ? (
            <div className="px-4 py-12 text-center text-white/40 text-sm">
              {t("noProducts")}
            </div>
          ) : (
            filteredBatches.map((batch) => (
              <div key={batch.id} className="p-3 sm:p-4 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-white text-sm sm:text-base truncate">
                      {batch.name}
                    </p>
                    <p className="text-[10px] sm:text-xs text-white/40 mt-0.5 sm:mt-1">
                      Batch #{batch.id}
                    </p>
                  </div>
                    <div className="flex gap-1.5">
                    <button
                      onClick={() => handleEdit(batch)}
                      className="rounded-full border border-white/20 px-2.5 py-1 text-[10px] text-white/80-hover:border-white/50"
                    >
                      <Pencil className="h-3 w-3" />
                    </button>
                    <button
                      onClick={() => handleDelete(batch)}
                      disabled={isPending && deletingId === batch.id}
                      className="rounded-full border border-red-400/40 px-2.5 py-1 text-[10px] text-red-300 hover:border-red-400 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 sm:gap-3 text-xs sm:text-sm">
                  <div>
                    <p className="text-white/40 text-[10px] sm:text-xs uppercase tracking-wide mb-1">
                      Weight
                    </p>
                    <p className="text-white/80 text-xs sm:text-sm">{batch.weight} gr</p>
                  </div>
                  <div>
                    <p className="text-white/40 text-[10px] sm:text-xs uppercase tracking-wide mb-1">
                      Quantity
                    </p>
                    <p className="text-white/80 text-xs sm:text-sm">{batch.quantity}</p>
                  </div>
                  <div>
                    <p className="text-white/40 text-[10px] sm:text-xs uppercase tracking-wide mb-1">
                      QR Count
                    </p>
                    <p className="text-white/80 text-xs sm:text-sm">{batch.qrCount}</p>
                  </div>
                  <div>
                    <p className="text-white/40 text-[10px] sm:text-xs uppercase tracking-wide mb-1">
                      Mode
                    </p>
                    <p className="text-white/80 text-xs sm:text-sm">{getModeLabel(batch)}</p>
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


