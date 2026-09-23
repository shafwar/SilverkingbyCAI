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
  onClick?: () => void;
  active?: boolean;
  hint?: string;
};

const accentMap: Record<
  NonNullable<DashboardCardProps["accent"]>,
  { bgClass: string; text: string }
> = {
  gold: { bgClass: "admin-card-gradient-gold", text: "text-[#FFD700]" },
  silver: { bgClass: "admin-card-gradient-silver", text: "text-[#C0C0C0]" },
  emerald: { bgClass: "admin-card-gradient-emerald", text: "text-emerald-300" },
  blue: { bgClass: "admin-card-gradient-blue", text: "text-sky-300" },
};

export function DashboardCard({
  title,
  value,
  delta,
  icon,
  accent = "gold",
  delay = 0,
  onClick,
  active = false,
  hint,
}: DashboardCardProps) {
  const accentDefinition = accentMap[accent];
  const Wrapper = onClick ? "button" : "div";

  return (
    <AnimatedCard delay={delay} className="relative overflow-hidden">
      <Wrapper
        type={onClick ? "button" : undefined}
        onClick={onClick}
        className={[
          "relative block w-full text-left",
          onClick
            ? "cursor-pointer rounded-[inherit] transition hover:bg-white/[0.02] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/25"
            : "",
        ]
          .filter(Boolean)
          .join(" ")}
        aria-pressed={onClick ? active : undefined}
      >
        <div
          className={`pointer-events-none absolute inset-0 ${accentDefinition.bgClass}`}
          aria-hidden="true"
        />
        <div className="relative flex items-start justify-between gap-3 p-0">
          <div className="flex-1 min-w-0">
            <p className="text-[9px] sm:text-[10px] uppercase tracking-[0.3em] sm:tracking-[0.35em] text-white/50 truncate">
              {title}
            </p>
            <motion.p
              className={`mt-1.5 sm:mt-2 text-2xl sm:text-3xl font-semibold ${accentDefinition.text} break-words`}
              layout
              key={String(value)}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
            >
              {value}
            </motion.p>
            {delta && (
              <p className="mt-1 text-[10px] sm:text-xs text-white/60 line-clamp-2">{delta}</p>
            )}
            {hint && <p className="mt-1.5 text-[10px] text-white/40">{hint}</p>}
          </div>
          {icon && (
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: delay + 0.1 }}
              className="rounded-full border border-white/10 bg-[#141414] p-2 sm:p-3 text-white flex-shrink-0"
            >
              {icon}
            </motion.div>
          )}
        </div>
      </Wrapper>
    </AnimatedCard>
  );
}


