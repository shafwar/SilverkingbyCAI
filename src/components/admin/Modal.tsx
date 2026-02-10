"use client";

import { ReactNode, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";

type ModalProps = {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  /** When true, modal uses most of viewport (95vw x 90vh) for full-screen content */
  fullScreen?: boolean;
};

export function Modal({ open, onClose, title, children, fullScreen }: ModalProps) {
  useEffect(() => {
    if (!open) return;
    const handler = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/90 backdrop-blur-md"
          onMouseDown={onClose}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          role="dialog"
          aria-modal="true"
          aria-label={title}
        >
          <motion.div
            onMouseDown={(event) => event.stopPropagation()}
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.3 }}
            className={`relative w-full rounded-3xl border border-white/10 bg-gradient-to-br from-black to-[#0a0a0a] shadow-2xl mx-4 flex flex-col ${
              fullScreen
                ? "max-w-[95vw] max-h-[90vh] p-4 sm:p-6 overflow-hidden"
                : "max-w-2xl p-4 sm:p-6 md:p-8"
            }`}
          >
            <button
              className="absolute right-4 top-4 rounded-full border border-white/10 p-2 text-white/60 transition hover:border-white/30 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFD700]"
              onClick={onClose}
            >
              <X className="h-4 w-4" />
            </button>
            {title && <h2 className="mb-4 text-xl sm:text-2xl font-semibold text-white shrink-0">{title}</h2>}
            <div className={fullScreen ? "min-h-0 flex-1 overflow-y-auto scrollbar-admin" : undefined}>
              {children}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
