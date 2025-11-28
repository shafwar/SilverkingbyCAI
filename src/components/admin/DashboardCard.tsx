"use client";

import { ReactNode } from "react";
import { motion } from "framer-motion";
import { AnimatedCard } from "./AnimatedCard";

type DashboardCardProps = {
  title: string;
  value: string | number;
  delta?: string;
  icon?: ReactNode;
  accent?: "gold" | "silver" | "emerald" | "blue";
  delay?: number;
};

const accentMap: Record<
  NonNullable<DashboardCardProps["accent"]>,
  { bg: string; text: string }
> = {
  gold: { bg: "from-[#FFD700]/20 via-[#E5C100]/10 to-transparent", text: "text-[#FFD700]" },
  silver: { bg: "from-[#C0C0C0]/20 via-[#A0A0A0]/10 to-transparent", text: "text-[#C0C0C0]" },
  emerald: { bg: "from-emerald-400/30 via-emerald-400/10 to-transparent", text: "text-emerald-300" },
  blue: { bg: "from-sky-400/30 via-sky-400/10 to-transparent", text: "text-sky-300" },
};

export function DashboardCard({
  title,
  value,
  delta,
  icon,
  accent = "gold",
  delay = 0,
}: DashboardCardProps) {
  const accentDefinition = accentMap[accent];
  return (
    <AnimatedCard delay={delay} className="relative overflow-hidden">
      <div
        className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${accentDefinition.bg}`}
        aria-hidden="true"
      />
      <div className="relative flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-[9px] sm:text-[10px] uppercase tracking-[0.3em] sm:tracking-[0.35em] text-white/50 truncate">{title}</p>
          <motion.p
            className={`mt-1.5 sm:mt-2 text-2xl sm:text-3xl font-semibold ${accentDefinition.text} break-words`}
            layout
            key={value}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            {value}
          </motion.p>
          {delta && <p className="mt-1 text-[10px] sm:text-xs text-white/60 line-clamp-2">{delta}</p>}
        </div>
        {icon && (
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: delay + 0.1 }}
            className="rounded-full border border-white/10 bg-white/5 p-2 sm:p-3 text-white flex-shrink-0"
          >
            {icon}
          </motion.div>
        )}
      </div>
    </AnimatedCard>
  );
}


