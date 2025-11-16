"use client";

import { useState } from "react";
import useSWR from "swr";
import { motion } from "framer-motion";
import { QrCode, Maximize2 } from "lucide-react";

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
            {product.qrImageUrl ? (
              <motion.div
                className="mt-6 flex items-center gap-4 rounded-2xl border border-white/5 bg-black/40 p-4"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={product.qrImageUrl}
                  alt={product.name}
                  className="h-28 w-28 rounded-2xl border border-white/10 bg-white p-3 object-contain"
                />
                <button
                  className="ml-auto inline-flex items-center gap-2 rounded-full border border-white/10 px-4 py-2 text-sm text-white/70 transition hover:border-[#FFD700]/40 hover:text-white"
                  onClick={() => setSelected(product)}
                >
                  <Maximize2 className="h-4 w-4" />
                  Enlarge
                </button>
              </motion.div>
            ) : (
              <p className="mt-6 text-sm text-white/40">QR not generated yet.</p>
            )}
          </AnimatedCard>
        ))}
      </div>

      <Modal open={Boolean(selected)} onClose={() => setSelected(null)} title={selected?.name}>
        {selected?.qrImageUrl ? (
          <div className="flex flex-col items-center gap-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={selected.qrImageUrl}
              alt={selected.name}
              className="h-72 w-72 rounded-3xl border border-white/10 bg-white p-6 object-contain"
            />
            <p className="font-mono text-sm text-white/70">{selected.serialCode}</p>
          </div>
        ) : (
          <p className="text-white/60">QR not available.</p>
        )}
      </Modal>
    </>
  );
}


