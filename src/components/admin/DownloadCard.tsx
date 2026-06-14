"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Minimize2, Maximize2, CheckCircle2, Loader2 } from "lucide-react";

export type ZipBatchUiRow = {
  batchIndex: number;
  totalBatches: number;
  fileCount?: number;
  downloaded: boolean;
  failed?: boolean;
  ready: boolean;
  inProgress?: boolean;
};

interface DownloadCardProps {
  percent: number;
  label?: string;
  onCancel?: () => void;
  onMinimize?: () => void;
  onDismiss?: () => void;
  isMinimized?: boolean;
  onToggleMinimize?: () => void;
  onCardClick?: () => void;
  isComplete?: boolean;
  zipBatches?: ZipBatchUiRow[];
  /** Status-only batch list — no download buttons (manual unduh di modal batch). */
  readOnlyBatches?: boolean;
  subtitle?: string;
}

export const DownloadCard: React.FC<DownloadCardProps> = ({
  percent,
  label,
  onCancel,
  onMinimize,
  onDismiss,
  isMinimized = false,
  onToggleMinimize,
  onCardClick,
  isComplete = false,
  zipBatches,
  readOnlyBatches = false,
  subtitle,
}) => {
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const hasBatches = Array.isArray(zipBatches) && zipBatches.length > 1;
  const downloadedBatchCount = hasBatches
    ? zipBatches!.filter((b) => b.downloaded).length
    : 0;

  const title = isComplete ? "ZIP selesai" : isMinimized ? "Mengunduh ZIP..." : "Mengunduh ZIP";

  const handleBackdrop = () => {
    onMinimize?.();
  };

  const handleClose = () => {
    if (isComplete && onDismiss) {
      onDismiss();
      return;
    }
    if (!isComplete && onCancel) {
      setShowCancelConfirm(true);
      return;
    }
    onMinimize?.();
  };

  const confirmCancel = () => {
    setShowCancelConfirm(false);
    onCancel?.();
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
        className={`fixed z-50 ${
          isMinimized
            ? "bottom-4 right-4 w-80"
            : "inset-0 flex flex-col items-center justify-center"
        }`}
      >
        {!isMinimized && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={handleBackdrop}
          />
        )}

        <motion.div
          layout
          className={`relative rounded-2xl border border-white/10 bg-black/95 backdrop-blur-xl shadow-[0_8px_32px_rgba(0,0,0,0.5)] ${
            isMinimized ? "p-4 max-h-[70vh] overflow-y-auto" : "p-6 w-full max-w-lg mx-auto"
          } ${onCardClick && !showCancelConfirm ? "cursor-pointer" : ""}`}
          onClick={(e) => {
            e.stopPropagation();
            if (!showCancelConfirm) onCardClick?.();
          }}
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-white">{title}</h3>
            <div className="flex items-center gap-2">
              {onToggleMinimize && !showCancelConfirm && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleMinimize();
                  }}
                  className="p-1.5 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-colors"
                  aria-label={isMinimized ? "Maximize" : "Minimize"}
                >
                  {isMinimized ? (
                    <Maximize2 className="h-4 w-4" />
                  ) : (
                    <Minimize2 className="h-4 w-4" />
                  )}
                </button>
              )}
              {(onCancel || onMinimize) && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (showCancelConfirm) {
                      setShowCancelConfirm(false);
                      return;
                    }
                    handleClose();
                  }}
                  className="p-1.5 rounded-lg text-white/60 hover:text-white hover:bg-red-500/20 transition-colors"
                  aria-label={showCancelConfirm ? "Tutup konfirmasi" : isComplete ? "Tutup" : "Batalkan"}
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>

          {showCancelConfirm ? (
            <div className="space-y-3 rounded-xl border border-red-500/30 bg-red-500/10 p-4">
              <p className="text-sm font-semibold text-red-200">Batalkan pemantauan ZIP?</p>
              <p className="text-[11px] text-red-100/80 leading-relaxed">
                Progress di browser ini akan dihentikan. ZIP yang sudah selesai di server tetap
                tersimpan di R2 — buka batch lagi untuk unduh ulang.
              </p>
              <div className="flex flex-col gap-2 sm:flex-row">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    confirmCancel();
                  }}
                  className="flex-1 rounded-lg border border-red-400/50 bg-red-500/25 px-3 py-2 text-xs font-semibold text-red-100 hover:bg-red-500/35 transition"
                >
                  Ya, batalkan sekarang
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowCancelConfirm(false);
                  }}
                  className="flex-1 rounded-lg border border-white/20 bg-white/5 px-3 py-2 text-xs font-medium text-white/80 hover:bg-white/10 transition"
                >
                  Tidak, lanjutkan
                </button>
              </div>
            </div>
          ) : (
            <div className={isMinimized ? "space-y-2" : "space-y-4"}>
              {subtitle && (
                <p className="text-[10px] text-white/50 leading-relaxed">{subtitle}</p>
              )}
              {onCardClick && !isComplete && (
                <p className="text-[10px] text-white/45">Klik kotak untuk buka batch</p>
              )}
              {label && (
                <div
                  className={`text-center font-medium text-white ${
                    isMinimized ? "text-xs" : "text-sm"
                  }`}
                >
                  {label}
                </div>
              )}
              <div className="w-full h-4 rounded-xl bg-white/10 overflow-hidden relative">
                <motion.div
                  className={`h-full rounded-xl transition-all duration-300 ${
                    isComplete
                      ? "bg-gradient-to-r from-emerald-500 via-green-400 to-emerald-300"
                      : "bg-gradient-to-r from-[#FFD700] via-yellow-400 to-[#FDE68A]"
                  }`}
                  initial={{ width: 0 }}
                  animate={{ width: `${percent}%` }}
                  transition={{ duration: 0.3, ease: "easeOut" }}
                />
              </div>
              <div
                className={`text-center text-white/60 ${
                  isMinimized ? "text-xs" : "text-sm"
                }`}
              >
                {percent}%
              </div>

              {hasBatches && readOnlyBatches && (
                <div className="space-y-2 rounded-xl border border-white/10 bg-white/[0.03] p-3">
                  <div className="text-[10px] text-white/55">
                    {zipBatches!.length} batch ZIP · {downloadedBatchCount} sudah di perangkat
                  </div>
                  <div
                    className={`space-y-1.5 ${isMinimized ? "max-h-36" : "max-h-52"} overflow-y-auto`}
                  >
                    {zipBatches!.map((b) => (
                      <div
                        key={b.batchIndex}
                        className="flex items-center gap-2 rounded-lg border border-white/10 bg-black/40 px-2.5 py-2"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="text-[11px] font-medium text-white">
                            Batch {b.batchIndex} dari {b.totalBatches}
                          </div>
                          <div className="text-[10px] text-white/45">
                            {b.fileCount != null ? `${b.fileCount} file` : "ZIP"}
                            {b.downloaded
                              ? " · sudah di perangkat"
                              : b.inProgress
                                ? " · mengunduh..."
                                : b.failed
                                  ? " · gagal otomatis"
                                  : b.ready
                                    ? " · antrian unduh"
                                    : " · menunggu server"}
                          </div>
                        </div>
                        {b.downloaded ? (
                          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
                        ) : b.inProgress ? (
                          <Loader2 className="h-4 w-4 shrink-0 animate-spin text-[#FFD700]" />
                        ) : null}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {onCancel && !isComplete && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowCancelConfirm(true);
                  }}
                  className="w-full rounded-lg border border-red-400/30 bg-red-500/10 px-3 py-2 text-center text-[11px] font-medium text-red-300/90 hover:bg-red-500/20 transition"
                >
                  Batalkan pemantauan
                </button>
              )}
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
