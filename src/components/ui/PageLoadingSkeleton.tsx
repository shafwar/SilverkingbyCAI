"use client";

import { motion } from "framer-motion";

/**
 * Lightweight loading skeleton for page transitions
 * Provides visual feedback during navigation
 */
export function PageLoadingSkeleton() {
  return (
    <div className="fixed inset-0 z-[9998] bg-luxury-black pointer-events-none">
      {/* Subtle loading indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="absolute inset-0 flex items-center justify-center"
      >
        <div className="flex flex-col items-center gap-3">
          {/* Spinner */}
          <div className="relative w-12 h-12">
            <div className="absolute inset-0 border-2 border-luxury-gold/20 rounded-full" />
            <motion.div
              className="absolute inset-0 border-2 border-transparent border-t-luxury-gold rounded-full"
              animate={{ rotate: 360 }}
              transition={{
                duration: 1,
                repeat: Infinity,
                ease: "linear",
              }}
            />
          </div>
          {/* Subtle pulse effect */}
          <motion.div
            className="w-1 h-1 rounded-full bg-luxury-gold/60"
            animate={{
              opacity: [0.3, 1, 0.3],
              scale: [1, 1.2, 1],
            }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
        </div>
      </motion.div>
    </div>
  );
}
