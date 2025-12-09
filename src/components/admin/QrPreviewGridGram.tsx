"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Modal } from "./Modal";
import {
  Search,
  X,
  Grid3x3,
  Table2,
  Filter,
  Download,
  Maximize2,
  RefreshCw,
  FileText,
  CheckCircle2,
} from "lucide-react";

type GramPreviewBatch = {
  batchId: number;
  name: string;
  weight: number;
  weightGroup: string | null;
  itemCount: number;
  firstItem: {
    id: number;
    uniqCode: string;
    serialCode: string;
    qrImageUrl: string;
    hasRootKey: boolean;
  };
  allItems: Array<{
    id: number;
    uniqCode: string;
    serialCode: string;
    qrImageUrl: string;
    hasRootKey: boolean;
  }>;
};

type Props = {
  batches: GramPreviewBatch[];
};

export function QrPreviewGridGram({ batches }: Props) {
  const t = useTranslations("admin.qrPreviewDetail");
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [layoutView, setLayoutView] = useState<"table" | "grid">("table");
  const [weightFilter, setWeightFilter] = useState<"ALL" | "SMALL" | "LARGE">("ALL");
  const [isDownloadingAll, setIsDownloadingAll] = useState(false);
  const [downloadingId, setDownloadingId] = useState<number | null>(null);
  const [selectedBatch, setSelectedBatch] = useState<GramPreviewBatch | null>(null);
  const [batchItems, setBatchItems] = useState<
    Array<{ serialCode: string; uniqCode: string; rootKey: string | null }>
  >([]);
  const [selectedQrItem, setSelectedQrItem] = useState<{ name: string; uniqCode: string } | null>(
    null
  );
  const [loadingBatchItems, setLoadingBatchItems] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

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
        const codeMatch = b.firstItem.uniqCode.toLowerCase().includes(q);
        const weightMatch = b.weight.toString().includes(q);
        return nameMatch || codeMatch || weightMatch;
      });
    }

    return result;
  }, [batches, searchQuery, weightFilter]);

  const totalItems = useMemo(() => {
    return filteredBatches.reduce((sum, batch) => sum + batch.itemCount, 0);
  }, [filteredBatches]);

  const handleSerialCodeClick = async (batch: GramPreviewBatch) => {
    setSelectedBatch(batch);
    setLoadingBatchItems(true);
    try {
      const response = await fetch(`/api/gram-products/batch/${batch.batchId}?includeItems=true`);
      if (response.ok) {
        const data = await response.json();
        setBatchItems(
          data.items.map((item: any) => ({
            serialCode: item.serialCode,
            uniqCode: item.uniqCode,
            rootKey: item.rootKey,
          }))
        );
      } else {
        console.error("Failed to fetch batch items");
        setBatchItems([]);
      }
    } catch (error) {
      console.error("Error fetching batch items:", error);
      setBatchItems([]);
    } finally {
      setLoadingBatchItems(false);
    }
  };

  const downloadZipBlob = async (response: Response, filename: string) => {
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  };

  const handleDownloadSingle = async (product: {
    id: number;
    name: string;
    weight: number;
    uniqCode: string;
    serialCode?: string;
    qrImageUrl: string | null;
    weightGroup: string | null;
    hasRootKey?: boolean;
  }) => {
    if (!product) return;
    try {
      setDownloadingId(product.id);

      const body = {
        product: {
          id: product.id,
          name: product.name,
          // IMPORTANT: For page 2 we use uniqCode as serialCode
          serialCode: product.uniqCode,
          weight: product.weight,
          isGram: true,
        },
      };

      const response = await fetch("/api/qr/download-single-pdf", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const text = await response.text();
        console.error("[GramPreview] Download single PDF failed:", text);
        throw new Error(text || "Failed to download QR certificate PDF");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${product.uniqCode}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("[GramPreview] handleDownloadSingle error:", error);
      alert("Gagal mengunduh Serticard QR (PDF tunggal). Silakan coba lagi.");
    } finally {
      setDownloadingId(null);
    }
  };

  const handleRefresh = () => {
    try {
      setIsRefreshing(true);
      router.refresh();
    } catch (error) {
      console.error("[GramPreview] handleRefresh error:", error);
    } finally {
      // Beri sedikit waktu supaya animasi terasa natural
      setTimeout(() => setIsRefreshing(false), 800);
    }
  };

  const handleDownloadAll = async () => {
    if (!filteredBatches.length) return;
    try {
      setIsDownloadingAll(true);
      const batchIds = filteredBatches.map((b) => b.batchId);

      const response = await fetch("/api/gram-products/export-excel", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ batchIds }),
      });

      if (!response.ok) {
        const text = await response.text();
        console.error("[GramPreview] Download Excel failed:", text);
        throw new Error("Failed to download Excel file");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `gram-products-${new Date().toISOString().split("T")[0]}.xlsx`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("[GramPreview] handleDownloadAll error:", error);
      alert("Gagal mengunduh file Excel. Silakan coba lagi.");
    } finally {
      setIsDownloadingAll(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header section: sama nuansanya dengan Page 1 (Vault QR) */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{
          duration: 0.6,
          ease: [0.22, 1, 0.36, 1],
        }}
        className="mb-4 rounded-3xl border border-white/5 bg-gradient-to-br from-white/[0.03] via-white/[0.02] to-transparent p-6 md:p-8 shadow-[0_8px_32px_rgba(0,0,0,0.3)] backdrop-blur-xl"
      >
        <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div className="space-y-3">
            <motion.p
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="text-xs font-medium uppercase tracking-[0.5em] text-white/40"
            >
              {t("eyebrow")}
            </motion.p>
            <motion.h1
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
              className="text-2xl md:text-3xl lg:text-4xl font-light tracking-[-0.02em] leading-[1.2] text-white"
            >
              {t("title")}
            </motion.h1>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="mt-2 text-sm leading-relaxed text-white/50 md:text-base"
            >
              {t("description")}
              {totalItems > 0 && (
                <span className="ml-1 text-[#FFD700]/80">
                  {totalItems} {totalItems === 1 ? t("item") : t("items")}.
                </span>
              )}
            </motion.p>
          </div>

          {totalItems > 0 && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, delay: 0.4 }}
              className="flex flex-col items-end gap-1 rounded-2xl border border-white/10 bg-white/5 px-6 py-4 backdrop-blur-sm"
            >
              <p className="text-xs uppercase tracking-[0.2em] text-white/40">{t("totalAssets")}</p>
              <p className="text-3xl font-light tracking-tight text-white">{totalItems}</p>
            </motion.div>
          )}
        </div>
      </motion.section>

      {/* Toolbar: search, filter, layout + actions */}
      <div className="space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <div className="relative w-full md:w-72">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
              <input
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
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-xs text-white/60">
              <Filter className="h-3 w-3" />
              <span>Mode</span>
            </div>
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
                ≤ 100gr
              </button>
              <button
                onClick={() => setWeightFilter("LARGE")}
                className={`px-3 py-1 rounded-full ${
                  weightFilter === "LARGE" ? "bg-white text-black" : "text-white/70"
                }`}
              >
                Over 100gr
              </button>
            </div>

            <div className="flex rounded-full border border-white/15 bg-white/5 p-1 text-xs">
              <button
                onClick={() => setLayoutView("table")}
                className={`flex items-center gap-1 rounded-full px-3 py-1 ${
                  layoutView === "table" ? "bg-white text-black" : "text-white/70"
                }`}
              >
                <Table2 className="h-3 w-3" />
                Table
              </button>
              <button
                onClick={() => setLayoutView("grid")}
                className={`flex items-center gap-1 rounded-full px-3 py-1 ${
                  layoutView === "grid" ? "bg-white text-black" : "text-white/70"
                }`}
              >
                <Grid3x3 className="h-3 w-3" />
                Grid
              </button>
            </div>
          </div>
        </div>

        {/* Action buttons: Muat Ulang + Unduh Semua (mirip Page 1) */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <motion.button
            type="button"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="group w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-full border border-white/20 bg-white/5 px-6 py-3 text-sm font-medium text-white backdrop-blur-sm transition-all hover:border-white/40 hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed"
            whileHover={{ scale: isRefreshing ? 1 : 1.02 }}
            whileTap={{ scale: isRefreshing ? 1 : 0.98 }}
            aria-label={t("refresh")}
          >
            <RefreshCw
              className={`h-4 w-4 flex-shrink-0 transition-transform ${
                isRefreshing ? "animate-spin" : "group-hover:rotate-180"
              }`}
            />
            <span className="whitespace-nowrap">
              {isRefreshing ? t("refreshing") : t("refresh")}
            </span>
          </motion.button>

          <motion.button
            type="button"
            onClick={handleDownloadAll}
            disabled={isDownloadingAll || filteredBatches.length === 0}
            className="group w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-full border border-white/20 bg-white/5 px-6 py-3 text-sm font-medium text-white backdrop-blur-sm transition-all hover:border-[#FFD700]/40 hover:bg-white/10 hover:shadow-[0_0_15px_rgba(255,255,255,0.1)] disabled:opacity-50 disabled:cursor-not-allowed"
            whileHover={{ scale: isDownloadingAll ? 1 : 1.02 }}
            whileTap={{ scale: isDownloadingAll ? 1 : 0.98 }}
            aria-label={t("downloadAll")}
          >
            <FileText className="h-4 w-4 flex-shrink-0 transition-transform group-hover:rotate-3" />
            <span className="whitespace-nowrap">
              {isDownloadingAll ? "Generating Excel..." : `Download Excel (${totalItems || 0})`}
            </span>
          </motion.button>
        </div>
      </div>

      {layoutView === "table" ? (
        <div className="overflow-hidden rounded-3xl border border-white/5 bg-white/[0.02]">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-white/70">
              <thead>
                <tr className="bg-white/[0.03] text-left text-xs uppercase tracking-[0.4em] text-white/40">
                  <th className="px-4 lg:px-6 py-4">{t("productName")}</th>
                  <th className="px-4 lg:px-6 py-4">{t("weight")}</th>
                  <th className="px-4 lg:px-6 py-4">{t("qrPreview")}</th>
                  <th className="px-4 lg:px-6 py-4">Uniqcode</th>
                  <th className="px-4 lg:px-6 py-4">Serial Code</th>
                  <th className="px-4 lg:px-6 py-4">Root Key</th>
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
                    <tr key={batch.batchId} className="border-t border-white/5">
                      <td className="px-4 lg:px-6 py-4">
                        <p className="font-semibold text-white">{batch.name}</p>
                        <p className="text-xs text-white/40">#{batch.batchId}</p>
                      </td>
                      <td className="px-4 lg:px-6 py-4">{batch.weight} gr</td>
                      <td className="px-4 lg:px-6 py-4">
                        <div className="flex items-center">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={
                              batch.firstItem.qrImageUrl ||
                              `/api/qr-gram/${encodeURIComponent(batch.firstItem.uniqCode)}`
                            }
                            alt={`QR code for ${batch.name} - ${batch.firstItem.uniqCode}`}
                            className="h-12 w-12 flex-shrink-0 rounded-lg border border-white/10 bg-white p-1.5 object-contain"
                            loading="lazy"
                          />
                        </div>
                      </td>
                      <td className="px-4 lg:px-6 py-4 font-mono text-xs text-white/80">
                        {batch.firstItem.uniqCode}
                      </td>
                      <td className="px-4 lg:px-6 py-4">
                        <button
                          onClick={() => handleSerialCodeClick(batch)}
                          className="font-mono text-xs text-white/80 hover:text-[#FFD700] cursor-pointer underline"
                        >
                          {batch.itemCount} items
                        </button>
                      </td>
                      <td className="px-4 lg:px-6 py-4">
                        {batch.firstItem.hasRootKey ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-green-500/20 px-2 py-1 text-[10px] text-green-400 border border-green-500/30">
                            <CheckCircle2 className="h-3 w-3" />
                            Active
                          </span>
                        ) : (
                          <span className="text-xs text-white/40">—</span>
                        )}
                      </td>
                      <td className="px-4 lg:px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() =>
                              setSelectedQrItem({
                                name: batch.name,
                                uniqCode: batch.firstItem.uniqCode,
                              })
                            }
                            className="inline-flex items-center gap-1 rounded-full border border-white/20 px-3 py-1 text-[11px] text-white/80 hover:border-white/50"
                          >
                            <Maximize2 className="h-3 w-3" />
                            {t("enlarge")}
                          </button>
                          <button
                            onClick={() =>
                              handleDownloadSingle({
                                id: batch.firstItem.id,
                                name: batch.name,
                                weight: batch.weight,
                                uniqCode: batch.firstItem.uniqCode,
                                serialCode: batch.firstItem.serialCode,
                                qrImageUrl: batch.firstItem.qrImageUrl,
                                weightGroup: batch.weightGroup,
                                hasRootKey: batch.firstItem.hasRootKey,
                              })
                            }
                            disabled={downloadingId === batch.firstItem.id}
                            className="inline-flex items-center gap-1 rounded-full border border-white/20 px-3 py-1 text-[11px] text-white/80 hover:border-white/50 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <Download className="h-3 w-3" />
                            {downloadingId === batch.firstItem.id
                              ? t("downloading")
                              : t("download")}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
        >
          {filteredBatches.length === 0 ? (
            <div className="col-span-full text-center text-white/40 text-sm">{t("noProducts")}</div>
          ) : (
            filteredBatches.map((batch) => (
              <div
                key={batch.batchId}
                className="group rounded-2xl border border-white/10 bg-white/[0.03] p-3 sm:p-4 hover:border-[#FFD700]/40 transition-all"
              >
                <div className="relative aspect-square w-full rounded-lg border border-white/10 bg-white p-3 mb-3">
                  <img
                    src={
                      batch.firstItem.qrImageUrl ||
                      `/api/qr-gram/${encodeURIComponent(batch.firstItem.uniqCode)}`
                    }
                    alt={batch.name}
                    className="h-full w-full object-contain"
                    loading="lazy"
                  />
                </div>
                <div className="space-y-1.5">
                  <p className="font-mono text-xs font-semibold text-white truncate">
                    {batch.firstItem.uniqCode}
                  </p>
                  <p className="text-xs text-white/70 line-clamp-2">{batch.name}</p>
                  <p className="text-xs text-white/50">{batch.weight} gr</p>
                  <p className="text-xs text-white/40">{batch.itemCount} items</p>
                </div>
              </div>
            ))
          )}
        </motion.div>
      )}

      {/* Serial Codes Modal - Shows all serial codes and root keys for a batch */}
      <Modal
        open={Boolean(selectedBatch)}
        onClose={() => {
          setSelectedBatch(null);
          setBatchItems([]);
        }}
        title={selectedBatch ? `${selectedBatch.name} - All Serial Codes` : ""}
      >
        {selectedBatch && (
          <div className="max-h-[70vh] overflow-y-auto">
            {loadingBatchItems ? (
              <div className="flex items-center justify-center py-8">
                <RefreshCw className="h-6 w-6 animate-spin text-white/40" />
                <span className="ml-2 text-white/60">Loading serial codes...</span>
              </div>
            ) : batchItems.length > 0 ? (
              <div className="space-y-2">
                <div className="grid grid-cols-3 gap-4 px-4 py-2 text-xs font-semibold text-white/60 border-b border-white/10">
                  <div>Serial Code</div>
                  <div>UniqCode</div>
                  <div>Root Key</div>
                </div>
                {batchItems.map((item, index) => (
                  <div
                    key={index}
                    className="grid grid-cols-3 gap-4 px-4 py-3 text-sm border-b border-white/5 hover:bg-white/5 transition-colors"
                  >
                    <div className="font-mono text-white/90">{item.serialCode}</div>
                    <div className="font-mono text-white/70 text-xs">{item.uniqCode}</div>
                    <div className="font-mono text-[#FFD700] font-semibold">
                      {item.rootKey || "N/A"}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-white/40">No items found for this batch.</div>
            )}
          </div>
        )}
      </Modal>

      {/* QR Preview Modal (enlarge like Page 1) */}
      <Modal
        open={Boolean(selectedQrItem)}
        onClose={() => setSelectedQrItem(null)}
        title={selectedQrItem ? `${selectedQrItem.name} - ${selectedQrItem.uniqCode}` : ""}
      >
        {selectedQrItem && (
          <div className="flex flex-col items-center gap-4">
            <div className="relative w-full max-w-sm">
              <div className="relative aspect-square w-full rounded-3xl border border-white/10 bg-white p-4 sm:p-6 overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  key={`qr-modal-${selectedQrItem.uniqCode}`}
                  src={`/api/qr-gram/${encodeURIComponent(selectedQrItem.uniqCode)}`}
                  alt={selectedQrItem.name}
                  className="h-full w-full object-contain transition-opacity duration-300"
                  loading="eager"
                />
              </div>
            </div>
            <p className="font-mono text-lg sm:text-xl text-white/70">{selectedQrItem.uniqCode}</p>
            <p className="text-sm text-white/60">{selectedQrItem.name}</p>
          </div>
        )}
      </Modal>
    </div>
  );
}
