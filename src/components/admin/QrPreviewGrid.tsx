"use client";

import { useState } from "react";
import useSWR from "swr";
import { motion } from "framer-motion";
import { QrCode, Maximize2, Download, FileText } from "lucide-react";

import { fetcher } from "@/lib/fetcher";
import { AnimatedCard } from "./AnimatedCard";
import { LoadingSkeleton } from "./LoadingSkeleton";
import { Modal } from "./Modal";

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
  const { data, error, isLoading } = useSWR<PreviewResponse>("/api/admin/qr-preview", fetcher, {
    refreshInterval: 60000,
  });
  const [selected, setSelected] = useState<Product | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isDownloadingAll, setIsDownloadingAll] = useState(false);

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
        const filenameMatch = contentDisposition.match(/filename="?(.+)"?/i);
        if (filenameMatch) {
          filename = filenameMatch[1];
        }
      }
      
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

  if (isLoading) {
    return <LoadingSkeleton className="h-64 w-full" />;
  }

  if (error || !data) {
    return <p className="text-sm text-red-400">Unable to load QR assets.</p>;
  }

  return (
    <>
      {/* Download All Button */}
      {data && data.products.length > 0 && (
        <div className="mb-6 flex justify-end">
          <motion.button
            onClick={handleDownloadAll}
            disabled={isDownloadingAll}
            className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/5 px-6 py-3 text-sm font-semibold text-white transition-all hover:border-[#FFD700]/40 hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed"
            whileHover={{ scale: isDownloadingAll ? 1 : 1.02 }}
            whileTap={{ scale: isDownloadingAll ? 1 : 0.98 }}
          >
            <FileText className="h-4 w-4" />
            {isDownloadingAll ? "Generating PNG..." : `Download All as PNG (${data.products.length})`}
          </motion.button>
        </div>
      )}

      <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
        {data.products.map((product, index) => (
          <AnimatedCard key={product.id} delay={index * 0.04}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.4em] text-white/60">Serial</p>
                <p className="mt-1 font-mono text-lg text-white">{product.serialCode}</p>
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
                src={product.qrImageUrl || `/api/qr/${product.serialCode}`}
                alt={product.name}
                className="h-28 w-28 rounded-2xl border border-white/10 bg-white p-3 object-contain"
                onError={(e) => {
                  // Fallback to API route if image fails to load
                  const target = e.target as HTMLImageElement;
                  if (target.src !== `/api/qr/${product.serialCode}`) {
                    target.src = `/api/qr/${product.serialCode}`;
                  }
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
        ))}
      </div>

      <Modal open={Boolean(selected)} onClose={() => setSelected(null)} title={selected?.name}>
        {selected && (
          <div className="flex flex-col items-center gap-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={selected.qrImageUrl || `/api/qr/${selected.serialCode}`}
              alt={selected.name}
              className="h-72 w-72 rounded-3xl border border-white/10 bg-white p-4 text-md object-contain"
              onError={(e) => {
                // Fallback to API route if image fails to load
                const target = e.target as HTMLImageElement;
                if (target.src !== `/api/qr/${selected.serialCode}`) {
                  target.src = `/api/qr/${selected.serialCode}`;
                }
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
