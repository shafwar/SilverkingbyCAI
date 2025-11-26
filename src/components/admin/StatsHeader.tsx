"use client";

import { ReactNode } from "react";
import { motion } from "framer-motion";

type StatsHeaderProps = {
  eyebrow: string;
  title: string;
  description?: string;
  actions?: ReactNode;
};

export function StatsHeader({ eyebrow, title, description, actions }: StatsHeaderProps) {
  return (
    <motion.header
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      className="flex flex-col gap-3 sm:gap-4 rounded-xl sm:rounded-2xl border border-white/5 bg-gradient-to-r from-white/[0.05] to-white/[0.02] p-4 sm:p-5 md:p-6 text-white shadow-[0_12px_50px_rgba(0,0,0,0.35)] backdrop-blur-xl md:flex-row md:items-center md:justify-between"
    >
      <div className="flex-1 min-w-0">
        <p className="text-[10px] sm:text-xs uppercase tracking-[0.4em] sm:tracking-[0.5em] text-[#C0C0C0]">{eyebrow}</p>
        <h1 className="mt-2 sm:mt-3 text-xl sm:text-2xl md:text-3xl font-semibold leading-tight">{title}</h1>
        {description && <p className="mt-2 max-w-2xl text-xs sm:text-sm text-white/60 leading-relaxed">{description}</p>}
      </div>
      {actions && <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">{actions}</div>}
    </motion.header>
  );
}


