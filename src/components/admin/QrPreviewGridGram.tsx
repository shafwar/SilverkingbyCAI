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

type GramPreviewProduct = {
  id: number;
  name: string;
  weight: number;
  uniqCode: string;
  serialCode?: string;
  qrImageUrl: string | null;
  weightGroup: string | null;
  hasRootKey?: boolean; // Indicates root key exists (for Page 2 two-step verification)
};

type Props = {
  products: GramPreviewProduct[];
};

export function QrPreviewGridGram({ products }: Props) {
  const t = useTranslations("admin.qrPreviewDetail");
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [layoutView, setLayoutView] = useState<"table" | "grid">("table");
  const [weightFilter, setWeightFilter] = useState<"ALL" | "SMALL" | "LARGE">("ALL");
  const [isDownloadingAll, setIsDownloadingAll] = useState(false);
  const [downloadingId, setDownloadingId] = useState<number | null>(null);
  const [selected, setSelected] = useState<GramPreviewProduct | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const filteredProducts = useMemo(() => {
    let result = products;

    if (weightFilter !== "ALL") {
      result = result.filter(
        (p) => (p.weightGroup || "").toUpperCase() === weightFilter.toUpperCase()
      );
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter((p) => {
        const nameMatch = p.name.toLowerCase().includes(q);
        const codeMatch = p.uniqCode.toLowerCase().includes(q);
        const weightMatch = p.weight.toString().includes(q);
        return nameMatch || codeMatch || weightMatch;
      });
    }

    return result;
  }, [products, searchQuery, weightFilter]);

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

  const handleDownloadSingle = async (product: GramPreviewProduct) => {
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
    if (!filteredProducts.length) return;
    try {
      setIsDownloadingAll(true);
      const body = {
        products: filteredProducts.map((p) => ({
          id: p.id,
          name: p.name,
          serialCode: p.uniqCode,
          weight: p.weight,
          isGram: true,
        })),
        batchNumber: 1,
        isGram: true,
      };

      const response = await fetch("/api/qr/download-multiple-pdf", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const text = await response.text();
        console.error("[GramPreview] Download all failed:", text);
        throw new Error("Failed to download QR certificates");
      }

      await downloadZipBlob(response, `qr-gram-batch.zip`);
    } catch (error) {
      console.error("[GramPreview] handleDownloadAll error:", error);
      alert("Gagal mengunduh semua serticard QR. Silakan coba lagi.");
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
              {filteredProducts.length > 0 && (
                <span className="ml-1 text-[#FFD700]/80">
                  {filteredProducts.length} {filteredProducts.length === 1 ? t("item") : t("items")}
                  .
                </span>
              )}
            </motion.p>
          </div>

          {products.length > 0 && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, delay: 0.4 }}
              className="flex flex-col items-end gap-1 rounded-2xl border border-white/10 bg-white/5 px-6 py-4 backdrop-blur-sm"
            >
              <p className="text-xs uppercase tracking-[0.2em] text-white/40">{t("totalAssets")}</p>
              <p className="text-3xl font-light tracking-tight text-white">{products.length}</p>
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
            disabled={isDownloadingAll || filteredProducts.length === 0}
            className="group w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-full border border-white/20 bg-white/5 px-6 py-3 text-sm font-medium text-white backdrop-blur-sm transition-all hover:border-[#FFD700]/40 hover:bg-white/10 hover:shadow-[0_0_15px_rgba(255,255,255,0.1)] disabled:opacity-50 disabled:cursor-not-allowed"
            whileHover={{ scale: isDownloadingAll ? 1 : 1.02 }}
            whileTap={{ scale: isDownloadingAll ? 1 : 0.98 }}
            aria-label={t("downloadAll")}
          >
            <FileText className="h-4 w-4 flex-shrink-0 transition-transform group-hover:rotate-3" />
            <span className="whitespace-nowrap">
              {isDownloadingAll
                ? t("generatingPng")
                : `${t("downloadAll")} (${filteredProducts.length || 0})`}
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
                {filteredProducts.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-white/40">
                      {t("noProducts")}
                    </td>
                  </tr>
                ) : (
                  filteredProducts.map((product) => (
                    <tr key={product.id} className="border-t border-white/5">
                      <td className="px-4 lg:px-6 py-4">
                        <p className="font-semibold text-white">{product.name}</p>
                        <p className="text-xs text-white/40">#{product.id}</p>
                      </td>
                      <td className="px-4 lg:px-6 py-4">{product.weight} gr</td>
                      <td className="px-4 lg:px-6 py-4">
                        <div className="flex items-center">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={
                              product.qrImageUrl ||
                              `/api/qr-gram/${encodeURIComponent(product.uniqCode)}`
                            }
                            alt={`QR code for ${product.name} - ${product.uniqCode}`}
                            className="h-12 w-12 flex-shrink-0 rounded-lg border border-white/10 bg-white p-1.5 object-contain"
                            loading="lazy"
                          />
                        </div>
                      </td>
                      <td className="px-4 lg:px-6 py-4 font-mono text-xs text-white/80">
                        {product.uniqCode}
                      </td>
                      <td className="px-4 lg:px-6 py-4 font-mono text-xs text-white/80">
                        {product.serialCode || "—"}
                      </td>
                      <td className="px-4 lg:px-6 py-4">
                        {product.hasRootKey ? (
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
                            onClick={() => setSelected(product)}
                            className="inline-flex items-center gap-1 rounded-full border border-white/20 px-3 py-1 text-[11px] text-white/80 hover:border-white/50"
                          >
                            <Maximize2 className="h-3 w-3" />
                            {t("enlarge")}
                          </button>
                          <button
                            onClick={() => handleDownloadSingle(product)}
                            disabled={downloadingId === product.id}
                            className="inline-flex items-center gap-1 rounded-full border border-white/20 px-3 py-1 text-[11px] text-white/80 hover:border-white/50 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <Download className="h-3 w-3" />
                            {downloadingId === product.id ? t("downloading") : t("download")}
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
          {filteredProducts.length === 0 ? (
            <div className="col-span-full text-center text-white/40 text-sm">{t("noProducts")}</div>
          ) : (
            filteredProducts.map((product) => (
              <div
                key={product.id}
                className="group rounded-2xl border border-white/10 bg-white/[0.03] p-3 sm:p-4 hover:border-[#FFD700]/40 transition-all"
              >
                <div className="relative aspect-square w-full rounded-lg border border-white/10 bg-white p-3 mb-3">
                  <img
                    src={
                      product.qrImageUrl || `/api/qr-gram/${encodeURIComponent(product.uniqCode)}`
                    }
                    alt={product.name}
                    className="h-full w-full object-contain"
                    loading="lazy"
                  />
                </div>
                <div className="space-y-1.5">
                  <p className="font-mono text-xs font-semibold text-white truncate">
                    {product.uniqCode}
                  </p>
                  <p className="text-xs text-white/70 line-clamp-2">{product.name}</p>
                  <p className="text-xs text-white/50">{product.weight} gr</p>
                </div>
              </div>
            ))
          )}
        </motion.div>
      )}

      {/* Preview Modal (same UX concept as page 1) */}
      <Modal open={Boolean(selected)} onClose={() => setSelected(null)} title={selected?.name}>
        {selected && (
          <div className="flex flex-col items-center gap-4">
            <div className="relative w-full max-w-sm">
              <div className="relative aspect-square w-full rounded-3xl border border-white/10 bg-white p-4 sm:p-6 overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  key={`qr-modal-${selected.uniqCode}`}
                  src={`/api/qr-gram/${encodeURIComponent(selected.uniqCode)}`}
                  alt={selected.name}
                  className="h-full w-full object-contain transition-opacity duration-300"
                  loading="eager"
                />
              </div>
            </div>
            <p className="font-mono text-lg sm:text-xl text-white/70">{selected.uniqCode}</p>
            <button
              onClick={() => handleDownloadSingle(selected)}
              disabled={downloadingId === selected.id}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-full border border-white/10 bg-black/40 px-6 py-3 text-sm text-white/70 transition hover:border-[#FFD700]/40 hover:bg-black/60 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Download className="h-4 w-4" />
              {downloadingId === selected.id ? t("downloading") : t("downloadQRCode")}
            </button>
          </div>
        )}
      </Modal>
    </div>
  );
}
