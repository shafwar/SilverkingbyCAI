"use client";

import { ReactNode } from "react";
import { motion } from "framer-motion";
import clsx from "clsx";

type AnimatedCardProps = {
  children: ReactNode;
  className?: string;
  delay?: number;
  onClick?: () => void;
  role?: string;
  ariaLabel?: string;
};

export function AnimatedCard({
  children,
  className,
  delay = 0,
  onClick,
  role,
  ariaLabel,
}: AnimatedCardProps) {
  return (
    <motion.div
      role={role}
      aria-label={ariaLabel}
      tabIndex={role ? 0 : undefined}
      onClick={onClick}
      className={clsx(
        "rounded-xl sm:rounded-2xl border border-white/5 bg-white/[0.03] p-4 sm:p-5 text-white shadow-[0_6px_30px_rgba(0,0,0,0.35)] backdrop-blur-xl transition hover:border-[#FFD700]/40 hover:bg-white/[0.05]",
        className
      )}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: "easeOut", delay }}
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.99 }}
      layout
    >
      {children}
    </motion.div>
  );
}


