"use client";

import { ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, QrCode, CheckCircle } from "lucide-react";

interface ProductDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  product: {
    id: string;
    name: string;
    weight: string;
    purity: string;
    serialPrefix: string;
    imageUrl?: string;
    description?: string;
  };
  onVerify?: () => void;
}

export function ProductDrawer({
  isOpen,
  onClose,
  product,
  onVerify,
}: ProductDrawerProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm"
          />

          {/* Drawer */}
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 z-50 max-h-[90vh] overflow-y-auto rounded-t-3xl border-t border-white/10 bg-gradient-to-b from-luxury-black via-luxury-black/95 to-luxury-black backdrop-blur-2xl"
          >
            <div className="mx-auto max-w-4xl px-6 py-8">
              {/* Header */}
              <div className="mb-8 flex items-start justify-between">
                <div>
                  <h2 className="mb-2 font-sans text-3xl font-bold text-white">{product.name}</h2>
                  <p className="text-sm uppercase tracking-[0.2em] text-white/60">
                    {product.serialPrefix}
                  </p>
                </div>
                <button
                  onClick={onClose}
                  className="rounded-full bg-white/10 p-2 text-white/80 hover:bg-white/20 hover:text-white transition-colors"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              {/* Image */}
              <div className="mb-8 aspect-square w-full overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-luxury-gold/10 to-transparent">
                {product.imageUrl ? (
                  <img
                    src={product.imageUrl}
                    alt={product.name}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center">
                    <QrCode className="h-24 w-24 text-luxury-gold/30" />
                  </div>
                )}
              </div>

              {/* Specifications */}
              <div className="mb-8 grid gap-4 sm:grid-cols-2">
                <div className="rounded-xl border border-white/10 bg-white/5 p-5 backdrop-blur-sm">
                  <p className="mb-2 text-xs uppercase tracking-[0.15em] text-white/50">Weight</p>
                  <p className="font-sans text-2xl font-bold text-luxury-gold">{product.weight}</p>
                </div>

                <div className="rounded-xl border border-white/10 bg-white/5 p-5 backdrop-blur-sm">
                  <p className="mb-2 text-xs uppercase tracking-[0.15em] text-white/50">Purity</p>
                  <p className="font-sans text-2xl font-bold text-luxury-gold">{product.purity}</p>
                </div>
              </div>

              {/* Description */}
              {product.description && (
                <div className="mb-8">
                  <h3 className="mb-3 text-lg font-semibold text-white">Description</h3>
                  <p className="leading-relaxed text-white/70">{product.description}</p>
                </div>
              )}

              {/* QR Preview */}
              <div className="mb-8 rounded-xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm">
                <div className="mb-4 flex items-center gap-2">
                  <QrCode className="h-5 w-5 text-luxury-gold" />
                  <h3 className="text-lg font-semibold text-white">QR Authentication</h3>
                </div>
                <div className="flex items-center justify-center rounded-lg bg-black/50 p-8">
                  <div className="h-32 w-32 rounded-lg border-2 border-dashed border-white/20 bg-white/5 flex items-center justify-center">
                    <QrCode className="h-16 w-16 text-white/20" />
                  </div>
                </div>
                <p className="mt-4 text-center text-sm text-white/60">
                  Each bar includes a unique QR code for verification
                </p>
              </div>

              {/* Actions */}
              <div className="flex flex-col gap-4 sm:flex-row">
                {onVerify && (
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={onVerify}
                    className="flex-1 rounded-full bg-gradient-to-r from-luxury-gold to-luxury-lightGold px-8 py-4 font-sans font-semibold text-black shadow-lg transition-all hover:shadow-xl hover:shadow-luxury-gold/30"
                  >
                    <div className="flex items-center justify-center gap-2">
                      <CheckCircle className="h-5 w-5" />
                      <span>Verify This Bar</span>
                    </div>
                  </motion.button>
                )}
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={onClose}
                  className="flex-1 rounded-full border border-white/20 bg-white/5 px-8 py-4 font-sans font-semibold text-white backdrop-blur-sm transition-all hover:bg-white/10"
                >
                  Close
                </motion.button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

