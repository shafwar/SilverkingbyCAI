"use client";

import { ReactNode, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { ModalPortal } from "@/components/ui/ModalPortal";

type ModalProps = {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
};

export function Modal({ open, onClose, title, children }: ModalProps) {
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
        <ModalPortal>
          <motion.div
            className="absolute inset-0 flex items-center justify-center bg-black/90 backdrop-blur-md"
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
              className="relative w-full max-w-2xl max-h-[calc(100dvh-32px)] overflow-y-auto rounded-3xl border border-white/10 bg-gradient-to-br from-black to-[#0a0a0a] p-4 sm:p-6 md:p-8 shadow-2xl mx-4"
            >
              <button
                className="absolute right-4 top-4 rounded-full border border-white/10 p-2 text-white/60 transition hover:border-white/30 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFD700]"
                onClick={onClose}
              >
                <X className="h-4 w-4" />
              </button>
              {title && <h2 className="mb-6 text-2xl font-semibold text-white">{title}</h2>}
              {children}
            </motion.div>
          </motion.div>
        </ModalPortal>
      )}
    </AnimatePresence>
  );
}
