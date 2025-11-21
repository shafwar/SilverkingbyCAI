"use client";

import { useState } from "react";
import useSWR from "swr";
import { motion } from "framer-motion";
import { QrCode, Maximize2, Download } from "lucide-react";

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

  const handleDownload = async (product: Product) => {
    // Use API route as fallback if qrImageUrl is null
    const qrUrl = product.qrImageUrl || `/api/qr/${product.serialCode}`;

    try {
      // Fetch the image
      const response = await fetch(qrUrl);
      if (!response.ok) {
        throw new Error(`Failed to fetch QR: ${response.statusText}`);
      }
      const blob = await response.blob();

      // Create a download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `QR-${product.serialCode}.png`;
      document.body.appendChild(link);
      link.click();

      // Cleanup
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Failed to download QR code:", error);
      // Show user-friendly error
      alert(`Failed to download QR code for ${product.serialCode}. Please try again.`);
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
              onClick={() => handleDownload({ ...selected, qrImageUrl: selected.qrImageUrl || `/api/qr/${selected.serialCode}` })}
              className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/40 px-6 py-3 text-sm text-white/70 transition hover:border-[#FFD700]/40 hover:bg-black/60 hover:text-white"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Download className="h-4 w-4" />
              Download QR Code
            </motion.button>
          </div>
        )}
      </Modal>
    </>
  );
}
