"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Minimize2, Maximize2 } from "lucide-react";

interface DownloadCardProps {
  percent: number; // 0-100
  label?: string;
  onCancel?: () => void;
  isMinimized?: boolean;
  onToggleMinimize?: () => void;
}

export const DownloadCard: React.FC<DownloadCardProps> = ({
  percent,
  label,
  onCancel,
  isMinimized = false,
  onToggleMinimize,
}) => {
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
        {/* Blurred Background - Only show when not minimized */}
        {!isMinimized && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={onCancel}
          />
        )}

        {/* Card */}
        <motion.div
          layout
          className={`relative rounded-2xl border border-white/10 bg-black/95 backdrop-blur-xl shadow-[0_8px_32px_rgba(0,0,0,0.5)] ${
            isMinimized ? "p-4" : "p-6 w-full max-w-lg mx-auto"
          }`}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header with controls */}
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-white">
              {isMinimized ? "Mengunduh..." : "Mengunduh Item"}
            </h3>
            <div className="flex items-center gap-2">
              {onToggleMinimize && (
                <button
                  onClick={onToggleMinimize}
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
              {onCancel && (
                <button
                  onClick={onCancel}
                  className="p-1.5 rounded-lg text-white/60 hover:text-white hover:bg-red-500/20 transition-colors"
                  aria-label="Cancel"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>

          {/* Progress Content */}
          <div className={isMinimized ? "space-y-2" : "space-y-4"}>
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
                className="h-full rounded-xl bg-gradient-to-r from-[#FFD700] via-yellow-400 to-[#FDE68A] transition-all duration-300"
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
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

