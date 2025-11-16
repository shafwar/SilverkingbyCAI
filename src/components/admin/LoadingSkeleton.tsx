"use client";

import clsx from "clsx";
import { motion } from "framer-motion";

type LoadingSkeletonProps = {
  className?: string;
};

export function LoadingSkeleton({ className }: LoadingSkeletonProps) {
  return (
    <motion.div
      aria-busy="true"
      aria-live="polite"
      className={clsx(
        "animate-pulse rounded-2xl border border-white/5 bg-white/5",
        className
      )}
      initial={{ opacity: 0.4 }}
      animate={{ opacity: [0.4, 0.7, 0.4] }}
      transition={{ repeat: Infinity, duration: 1.6 }}
    />
  );
}


