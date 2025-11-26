"use client";

import { useState, useMemo } from "react";
import useSWR from "swr";
import { motion, AnimatePresence } from "framer-motion";
import {
  QrCode,
  Maximize2,
  Download,
  FileText,
  CheckSquare2,
  Square,
  Grid3x3,
  Table2,
  Search,
  RefreshCw,
} from "lucide-react";

import { fetcher } from "@/lib/fetcher";
import { LoadingSkeleton } from "./LoadingSkeleton";
import { Modal } from "./Modal";
import { AnimatedCard } from "./AnimatedCard";

type Product = {
  id: number;
  name: string;
  weight: number;
  serialCode: string;
  qrImageUrl: string | null;
};

type PreviewResponse = {
  products: Product[];
};

export function QrPreviewGrid() {
  const { data, error, isLoading, mutate } = useSWR<PreviewResponse>("/api/admin/qr-preview", fetcher, {
    refreshInterval: 60000,
  });
  const [selected, setSelected] = useState<Product | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isDownloadingAll, setIsDownloadingAll] = useState(false);
  const [isDownloadingSelected, setIsDownloadingSelected] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [selectedItems, setSelectedItems] = useState<Set<number>>(new Set());
  const [layoutView, setLayoutView] = useState<"table" | "grid">("table");
  const [searchQuery, setSearchQuery] = useState("");

  // Filter products based on search query
  const filteredProducts = useMemo(() => {
    if (!data?.products) return [];

    if (!searchQuery.trim()) {
      return data.products;
    }

    const query = searchQuery.toLowerCase().trim();
    return data.products.filter((product) => {
      const nameMatch = product.name.toLowerCase().includes(query);
      const serialMatch = product.serialCode.toLowerCase().includes(query);

      return nameMatch || serialMatch;
    });
  }, [data?.products, searchQuery]);

  const handleDownload = async (product: Product) => {
    setIsDownloading(true);
    try {
      // Use PNG download endpoint (more reliable than PDF)
      const response = await fetch(`/api/qr/${product.serialCode}/download`);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || `Failed to fetch QR: ${response.statusText}`);
      }

      const blob = await response.blob();

      // Create a download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;

      // Get filename from Content-Disposition header or use default
      const contentDisposition = response.headers.get("Content-Disposition");
      let filename = `QR-${product.serialCode}.png`;
      if (contentDisposition) {
        // Handle both quoted and unquoted filenames
        const filenameMatch = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/i);
        if (filenameMatch && filenameMatch[1]) {
          // Remove quotes if present
          filename = filenameMatch[1].replace(/['"]/g, "").trim();
        }
      }

      // Ensure filename is properly formatted (remove any encoding artifacts)
      filename = decodeURIComponent(filename);
      link.download = filename;
      document.body.appendChild(link);
      link.click();

      // Cleanup
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error: any) {
      console.error("Failed to download QR code:", error);
      alert(`Failed to download QR code: ${error.message || "Please try again"}`);
    } finally {
      setIsDownloading(false);
    }
  };

  const handleDownloadAll = async () => {
    if (!data?.products || data.products.length === 0) {
      alert("No products available to download.");
      return;
    }

    setIsDownloadingAll(true);
    try {
      // Download all QR codes as a single PNG grid image
      const response = await fetch("/api/qr/download-all-png");

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || "Failed to generate PNG grid");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;

      // Get filename from Content-Disposition header or use default
      const contentDisposition = response.headers.get("Content-Disposition");
      let filename = `Silver-King-All-QR-Codes-${new Date().toISOString().split("T")[0]}.png`;
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="?(.+)"?/i);
        if (filenameMatch) {
          filename = filenameMatch[1];
        }
      }

      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      // Show success message
      alert(`Successfully downloaded PNG with ${data.products.length} QR code(s)!`);
    } catch (error: any) {
      console.error("Failed to download PNG:", error);
      alert(`Failed to download PNG: ${error.message || "Please try again"}`);
    } finally {
      setIsDownloadingAll(false);
    }
  };

  const handleDownloadSelected = async () => {
    if (selectedItems.size === 0) {
      alert("Please select at least one QR code to download.");
      return;
    }

    if (!data?.products) return;

    const selectedProducts = data.products.filter((p) => selectedItems.has(p.id));
    const serialCodes = selectedProducts.map((p) => p.serialCode);

    setIsDownloadingSelected(true);
    try {
      // Download selected QR codes as a single PNG grid image
      const response = await fetch("/api/qr/download-selected-png", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ serialCodes }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || "Failed to generate PNG grid");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;

      // Get filename from Content-Disposition header or use default
      const contentDisposition = response.headers.get("Content-Disposition");
      let filename = `Silver-King-Selected-QR-Codes-${serialCodes.length}-${new Date().toISOString().split("T")[0]}.png`;
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/i);
        if (filenameMatch && filenameMatch[1]) {
          filename = filenameMatch[1].replace(/['"]/g, "").trim();
        }
      }

      filename = decodeURIComponent(filename);
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      // Show success message
      alert(`Successfully downloaded PNG with ${serialCodes.length} selected QR code(s)!`);
    } catch (error: any) {
      console.error("Failed to download selected PNG:", error);
      alert(`Failed to download selected PNG: ${error.message || "Please try again"}`);
    } finally {
      setIsDownloadingSelected(false);
    }
  };

  const toggleSelectItem = (productId: number) => {
    setSelectedItems((prev) => {
      const next = new Set(prev);
      if (next.has(productId)) {
        next.delete(productId);
      } else {
        next.add(productId);
      }
      return next;
    });
  };

  const isIndeterminate = useMemo(() => {
    if (!filteredProducts || filteredProducts.length === 0) return false;
    return selectedItems.size > 0 && selectedItems.size < filteredProducts.length;
  }, [filteredProducts, selectedItems.size]);

  // Update select all to work with filtered products
  const handleRefresh = async () => {
    setIsRegenerating(true);
    try {
      // Simply refresh the data from server (no regeneration)
      // This will fetch latest QR codes with correct serial numbers from database
      await mutate();
    } catch (error: any) {
      console.error("Failed to refresh QR codes:", error);
    } finally {
      setIsRegenerating(false);
    }
  };

  const toggleSelectAll = () => {
    if (!filteredProducts) return;

    const allFilteredIds = filteredProducts.map((p) => p.id);
    const allFilteredSelected = allFilteredIds.every((id) => selectedItems.has(id));

    if (allFilteredSelected) {
      // Deselect all filtered items
      setSelectedItems((prev) => {
        const next = new Set(prev);
        allFilteredIds.forEach((id) => next.delete(id));
        return next;
      });
    } else {
      // Select all filtered items
      setSelectedItems((prev) => {
        const next = new Set(prev);
        allFilteredIds.forEach((id) => next.add(id));
        return next;
      });
    }
  };

  const isAllSelected = useMemo(() => {
    if (!filteredProducts || filteredProducts.length === 0) return false;
    return filteredProducts.every((p) => selectedItems.has(p.id));
  }, [filteredProducts, selectedItems]);

  if (isLoading) {
    return <LoadingSkeleton className="h-64 w-full" />;
  }

  if (error || !data) {
    return <p className="text-sm text-red-400">Unable to load QR assets.</p>;
  }

  return (
    <>
      {/* Mesmerizing Header Section */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{
          duration: 0.6,
          ease: [0.22, 1, 0.36, 1],
        }}
        className="mb-10 rounded-3xl border border-white/5 bg-gradient-to-br from-white/[0.03] via-white/[0.02] to-transparent p-8 md:p-10 shadow-[0_8px_32px_rgba(0,0,0,0.3)] backdrop-blur-xl"
      >
        <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          {/* Typography Section */}
          <div className="space-y-3">
            <motion.p
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="text-xs font-medium uppercase tracking-[0.5em] text-white/40"
            >
              QR Vault
            </motion.p>
            <motion.h1
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
              className="text-3xl md:text-4xl lg:text-5xl font-light tracking-[-0.02em] leading-[1.2] text-white"
            >
              Every{" "}
              <span className="relative inline-block">
                <span className="relative z-10 bg-gradient-to-r from-[#FFD700] via-[#FFF8DC] to-[#FFD700] bg-clip-text text-transparent font-medium">
                  serialized
                </span>
                <motion.span
                  className="absolute inset-0 bg-gradient-to-r from-[#FFD700]/20 via-transparent to-[#FFD700]/20 blur-2xl"
                  animate={{
                    opacity: [0.4, 0.6, 0.4],
                    scale: [1, 1.05, 1],
                  }}
                  transition={{
                    duration: 3,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                />
              </span>{" "}
              artifact
            </motion.h1>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="mt-2 text-sm leading-relaxed text-white/50 md:text-base"
            >
              High-fidelity QR assets, ready to scan.
              {filteredProducts.length > 0 && (
                <span className="ml-1 text-[#FFD700]/80">
                  {filteredProducts.length} {filteredProducts.length === 1 ? "item" : "items"}.
                </span>
              )}
            </motion.p>
          </div>

          {/* Stats Badge */}
          {data && data.products.length > 0 && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, delay: 0.4 }}
              className="flex flex-col items-end gap-1 rounded-2xl border border-white/10 bg-white/5 px-6 py-4 backdrop-blur-sm"
            >
              <p className="text-xs uppercase tracking-[0.2em] text-white/40">Total Assets</p>
              <p className="text-3xl font-light tracking-tight text-white">
                {data.products.length}
              </p>
              {selectedItems.size > 0 && (
                <motion.p
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-xs font-medium text-[#FFD700]"
                >
                  {selectedItems.size} selected
                </motion.p>
              )}
            </motion.div>
          )}
        </div>
      </motion.section>

      {/* Search Bar and Layout Toggle */}
      {data && data.products.length > 0 && (
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-1 items-center gap-4">
            {/* Search Bar */}
            <motion.div
              className="group flex flex-1 items-center rounded-full border border-white/10 bg-white/5 px-5 py-3 focus-within:border-[#FFD700]/50 focus-within:bg-white/10 focus-within:shadow-[0_0_20px_rgba(255,215,0,0.15)] transition-all max-w-md backdrop-blur-sm"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{
                duration: 0.4,
                ease: [0.22, 1, 0.36, 1],
                delay: 0.5,
              }}
            >
              <Search className="h-4 w-4 text-white/50 mr-3 transition-colors group-focus-within:text-[#FFD700]/70" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by product name or serial..."
                className="flex-1 bg-transparent text-sm font-light text-white placeholder:text-white/40 placeholder:font-light focus:outline-none"
              />
            </motion.div>

            {/* Layout Toggle - Fluid Switch */}
            <motion.div
              className="relative flex items-center gap-0.5 rounded-full border border-white/10 bg-black/40 p-1 backdrop-blur-sm"
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{
                duration: 0.4,
                ease: [0.22, 1, 0.36, 1],
                delay: 0.55,
              }}
            >
              {/* Sliding Background Indicator */}
              <motion.div
                className="absolute inset-y-1 rounded-full bg-gradient-to-r from-[#FFD700]/30 to-[#FFD700]/20 backdrop-blur-sm shadow-[0_0_20px_rgba(255,215,0,0.3)]"
                layout
                initial={false}
                transition={{
                  type: "spring",
                  stiffness: 600,
                  damping: 30,
                }}
                style={{
                  width: "calc(50% - 4px)",
                  left: layoutView === "table" ? "4px" : "calc(50% + 0px)",
                }}
              />

              <motion.button
                onClick={() => setLayoutView("table")}
                className="relative z-10 flex items-center justify-center p-2 rounded-lg transition-colors min-w-[36px]"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                transition={{
                  type: "spring",
                  stiffness: 400,
                  damping: 25,
                }}
              >
                <motion.div
                  animate={{
                    color: layoutView === "table" ? "#FFD700" : "#ffffff99",
                    scale: layoutView === "table" ? 1.1 : 1,
                  }}
                  transition={{
                    duration: 0.2,
                    ease: "easeOut",
                  }}
                >
                  <Table2 className="h-4 w-4" />
                </motion.div>
              </motion.button>
              <motion.button
                onClick={() => setLayoutView("grid")}
                className="relative z-10 flex items-center justify-center p-2 rounded-lg transition-colors min-w-[36px]"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                transition={{
                  type: "spring",
                  stiffness: 400,
                  damping: 25,
                }}
              >
                <motion.div
                  animate={{
                    color: layoutView === "grid" ? "#FFD700" : "#ffffff99",
                    scale: layoutView === "grid" ? 1.1 : 1,
                  }}
                  transition={{
                    duration: 0.2,
                    ease: "easeOut",
                  }}
                >
                  <Grid3x3 className="h-4 w-4" />
                </motion.div>
              </motion.button>
            </motion.div>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      {data && data.products.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.6 }}
          className="mb-8 flex flex-wrap items-center justify-between gap-4"
        >
          <div className="flex items-center gap-2 text-xs font-light uppercase tracking-[0.1em] text-white/40">
            <span>
              {selectedItems.size > 0
                ? `${selectedItems.size} of ${filteredProducts.length} selected`
                : `${filteredProducts.length} of ${data.products.length} products`}
              {searchQuery && ` (filtered)`}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {selectedItems.size > 0 && (
              <motion.button
                onClick={handleDownloadSelected}
                disabled={isDownloadingSelected}
                className="group inline-flex items-center gap-2 rounded-full border border-[#FFD700]/60 bg-[#FFD700]/10 px-6 py-3 text-sm font-medium text-white backdrop-blur-sm transition-all hover:border-[#FFD700] hover:bg-[#FFD700]/20 hover:shadow-[0_0_20px_rgba(255,215,0,0.3)] disabled:opacity-50 disabled:cursor-not-allowed"
                whileHover={{ scale: isDownloadingSelected ? 1 : 1.02 }}
                whileTap={{ scale: isDownloadingSelected ? 1 : 0.98 }}
              >
                <Download className="h-4 w-4 transition-transform group-hover:translate-y-0.5" />
                {isDownloadingSelected
                  ? "Generating..."
                  : `Download Selected (${selectedItems.size})`}
              </motion.button>
            )}
            <motion.button
              onClick={handleRefresh}
              disabled={isRegenerating}
              className="group inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/5 px-6 py-3 text-sm font-medium text-white backdrop-blur-sm transition-all hover:border-white/40 hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed"
              whileHover={{ scale: isRegenerating ? 1 : 1.02 }}
              whileTap={{ scale: isRegenerating ? 1 : 0.98 }}
            >
              <RefreshCw className={`h-4 w-4 transition-transform ${isRegenerating ? "animate-spin" : "group-hover:rotate-180"}`} />
              {isRegenerating ? "Refreshing..." : "Refresh"}
            </motion.button>
            <motion.button
              onClick={handleDownloadAll}
              disabled={isDownloadingAll}
              className="group inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/5 px-6 py-3 text-sm font-medium text-white backdrop-blur-sm transition-all hover:border-[#FFD700]/40 hover:bg-white/10 hover:shadow-[0_0_15px_rgba(255,255,255,0.1)] disabled:opacity-50 disabled:cursor-not-allowed"
              whileHover={{ scale: isDownloadingAll ? 1 : 1.02 }}
              whileTap={{ scale: isDownloadingAll ? 1 : 0.98 }}
            >
              <FileText className="h-4 w-4 transition-transform group-hover:rotate-3" />
              {isDownloadingAll ? "Generating PNG..." : `Download All (${data.products.length})`}
            </motion.button>
          </div>
        </motion.div>
      )}

      {/* Table Layout with Smooth Transition */}
      <AnimatePresence mode="wait">
        {layoutView === "table" ? (
          <motion.div
            key="table-layout"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{
              duration: 0.3,
              ease: [0.22, 1, 0.36, 1],
            }}
          >
            <div className="overflow-hidden rounded-3xl border border-white/10">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-white/10">
                  <thead>
                    <tr className="bg-white/5">
                      <th scope="col" className="w-12 px-4 py-3">
                        <button
                          type="button"
                          onClick={toggleSelectAll}
                          className="inline-flex items-center justify-center text-white/60 hover:text-white transition-colors"
                        >
                          {isAllSelected ? (
                            <CheckSquare2 className="h-5 w-5 text-[#FFD700]" />
                          ) : isIndeterminate ? (
                            <div className="relative h-5 w-5">
                              <Square className="h-5 w-5 text-white/40" />
                              <div className="absolute inset-0 flex items-center justify-center">
                                <div className="h-2 w-2 bg-[#FFD700]" />
                              </div>
                            </div>
                          ) : (
                            <Square className="h-5 w-5 text-white/40" />
                          )}
                        </button>
                      </th>
                      <th
                        scope="col"
                        className="px-4 py-3 text-left text-xs font-light uppercase tracking-[0.3em] text-white/60"
                      >
                        Serial Code
                      </th>
                      <th
                        scope="col"
                        className="px-4 py-3 text-left text-xs font-light uppercase tracking-[0.3em] text-white/60"
                      >
                        Product Name
                      </th>
                      <th
                        scope="col"
                        className="px-4 py-3 text-left text-xs font-light uppercase tracking-[0.3em] text-white/60"
                      >
                        Weight
                      </th>
                      <th
                        scope="col"
                        className="px-4 py-3 text-left text-xs font-light uppercase tracking-[0.3em] text-white/60"
                      >
                        QR Preview
                      </th>
                      <th
                        scope="col"
                        className="px-4 py-3 text-right text-xs font-light uppercase tracking-[0.3em] text-white/60"
                      >
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 bg-black/20">
                    {filteredProducts.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-4 py-8 text-center text-sm text-white/60">
                          No products found {searchQuery && `matching "${searchQuery}"`}
                        </td>
                      </tr>
                    ) : (
                      filteredProducts.map((product) => {
                        const isItemSelected = selectedItems.has(product.id);
                        return (
                          <motion.tr
                            key={product.id}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className={`transition-colors hover:bg-white/5 ${
                              isItemSelected ? "bg-[#FFD700]/5" : ""
                            }`}
                          >
                            <td className="px-4 py-4">
                              <button
                                type="button"
                                onClick={() => toggleSelectItem(product.id)}
                                className="inline-flex items-center justify-center text-white/60 hover:text-white transition-colors"
                              >
                                {isItemSelected ? (
                                  <CheckSquare2 className="h-5 w-5 text-[#FFD700]" />
                                ) : (
                                  <Square className="h-5 w-5 text-white/40" />
                                )}
                              </button>
                            </td>
                            <td className="px-4 py-4">
                              <div className="font-mono text-sm font-semibold text-white">
                                {product.serialCode}
                              </div>
                            </td>
                            <td className="px-4 py-4">
                              <div className="text-sm font-medium text-white">{product.name}</div>
                            </td>
                            <td className="px-4 py-4">
                              <div className="text-sm text-white/60">{product.weight} gr</div>
                            </td>
                            <td className="px-4 py-4">
                              <div className="flex items-center gap-3">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                  src={product.qrImageUrl || `/api/qr/${product.serialCode}`}
                                  alt={product.name}
                                  className="h-16 w-16 rounded-lg border border-white/10 bg-white p-2 object-contain"
                                  onError={(e) => {
                                    const target = e.target as HTMLImageElement;
                                    if (target.src !== `/api/qr/${product.serialCode}`) {
                                      target.src = `/api/qr/${product.serialCode}`;
                                    }
                                  }}
                                />
                              </div>
                            </td>
                            <td className="px-4 py-4">
                              <div className="flex items-center justify-end gap-2">
                                <motion.button
                                  onClick={() => setSelected(product)}
                                  className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white/70 transition hover:border-[#FFD700]/40 hover:bg-white/10 hover:text-white"
                                  whileHover={{ scale: 1.05 }}
                                  whileTap={{ scale: 0.95 }}
                                >
                                  <Maximize2 className="h-3.5 w-3.5" />
                                  Enlarge
                                </motion.button>
                                <motion.button
                                  onClick={() => handleDownload(product)}
                                  disabled={isDownloading}
                                  className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white/70 transition hover:border-[#FFD700]/40 hover:bg-white/10 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
                                  whileHover={{ scale: isDownloading ? 1 : 1.05 }}
                                  whileTap={{ scale: isDownloading ? 1 : 0.95 }}
                                >
                                  <Download className="h-3.5 w-3.5" />
                                  Download
                                </motion.button>
                              </div>
                            </td>
                          </motion.tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </motion.div>
        ) : (
          /* Grid Layout with Smooth Transition */
          <motion.div
            key="grid-layout"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{
              duration: 0.3,
              ease: [0.22, 1, 0.36, 1],
            }}
            className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3"
          >
            {filteredProducts.length === 0 ? (
              <div className="col-span-full rounded-2xl border border-white/10 bg-white/5 p-10 text-center text-white/60">
                No products found {searchQuery && `matching "${searchQuery}"`}
              </div>
            ) : (
              filteredProducts.map((product, index) => {
                const isItemSelected = selectedItems.has(product.id);
                return (
          <AnimatedCard key={product.id} delay={index * 0.04}>
            <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => toggleSelectItem(product.id)}
                          className="inline-flex items-center justify-center text-white/60 hover:text-white transition-colors"
                        >
                          {isItemSelected ? (
                            <CheckSquare2 className="h-5 w-5 text-[#FFD700]" />
                          ) : (
                            <Square className="h-5 w-5 text-white/40" />
                          )}
                        </button>
              <div>
                <p className="text-xs uppercase tracking-[0.4em] text-white/60">Serial</p>
                <p className="mt-1 font-mono text-lg text-white">{product.serialCode}</p>
                        </div>
              </div>
              <div className="rounded-full border border-white/10 p-3">
                <QrCode className="h-5 w-5 text-[#FFD700]" />
              </div>
            </div>
            <p className="mt-4 text-2xl font-semibold">{product.name}</p>
            <p className="text-sm text-white/60">{product.weight} gr</p>
              <motion.div
                className="mt-6 flex items-center gap-4 rounded-2xl border border-white/5 bg-black/40 p-4"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
              >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={`/api/qr/${product.serialCode}?t=${Date.now()}`}
                        alt={product.name}
                        className="h-28 w-28 rounded-2xl border border-white/10 bg-white p-3 object-contain"
                        onError={(e) => {
                          // Fallback: try with different timestamp
                          const target = e.target as HTMLImageElement;
                          target.src = `/api/qr/${product.serialCode}?t=${Date.now()}`;
                        }}
                      />
                <button
                  className="ml-auto inline-flex items-center gap-2 rounded-full border border-white/10 px-4 py-2 text-sm text-white/70 transition hover:border-[#FFD700]/40 hover:text-white"
                  onClick={() => setSelected(product)}
                >
                  <Maximize2 className="h-4 w-4" />
                  Enlarge
                </button>
              </motion.div>
                  </AnimatedCard>
                );
              })
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <Modal open={Boolean(selected)} onClose={() => setSelected(null)} title={selected?.name}>
        {selected && (
          <div className="flex flex-col items-center gap-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`/api/qr/${selected.serialCode}?t=${Date.now()}`}
              alt={selected.name}
              className="h-72 w-72 rounded-3xl border border-white/10 bg-white p-4 text-md object-contain"
              onError={(e) => {
                // Fallback: try with different timestamp
                const target = e.target as HTMLImageElement;
                target.src = `/api/qr/${selected.serialCode}?t=${Date.now()}`;
              }}
            />
            <p className="font-mono text-md text-white/70">{selected.serialCode}</p>
            <motion.button
              onClick={() => handleDownload(selected)}
              disabled={isDownloading}
              className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/40 px-6 py-3 text-sm text-white/70 transition hover:border-[#FFD700]/40 hover:bg-black/60 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
              whileHover={{ scale: isDownloading ? 1 : 1.05 }}
              whileTap={{ scale: isDownloading ? 1 : 0.95 }}
            >
              <Download className="h-4 w-4" />
              {isDownloading ? "Downloading..." : "Download QR Code"}
            </motion.button>
          </div>
        )}
      </Modal>
    </>
  );
}
