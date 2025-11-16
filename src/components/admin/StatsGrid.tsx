"use client";

import { useLayoutEffect, useRef } from "react";
import { motion } from "framer-motion";
import gsap from "gsap";
import { ArrowUpRight } from "lucide-react";

type StatItem = {
  label: string;
  value: number;
  delta: string;
  accent: "gold" | "silver" | "blue" | "violet";
};

const accentMap: Record<StatItem["accent"], string> = {
  gold: "from-[#FFD700]/40 via-[#FFD700]/10 to-transparent",
  silver: "from-[#C0C0C0]/40 via-[#C0C0C0]/10 to-transparent",
  blue: "from-[#4C6EF5]/40 via-[#4C6EF5]/10 to-transparent",
  violet: "from-[#A78BFA]/40 via-[#A78BFA]/10 to-transparent",
};

export function StatsGrid({ items }: { items: StatItem[] }) {
  const cardsRef = useRef<HTMLDivElement[]>([]);

  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      cardsRef.current.forEach((card, index) => {
        if (!card) return;
        const valueNode = card.querySelector<HTMLSpanElement>("[data-stat-value]");
        const tl = gsap.timeline({ delay: index * 0.09 });
        tl.from(card, { opacity: 0, y: 24, duration: 0.6, ease: "power3.out" });
        if (valueNode) {
          const target = Number(valueNode.dataset.target ?? 0);
          gsap.fromTo(
            valueNode,
            { innerText: 0 },
            {
              innerText: target,
              duration: 1,
              ease: "power2.out",
              snap: { innerText: 1 },
            }
          );
        }
      });
    });
    return () => ctx.revert();
  }, [items]);

  return (
    <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
      {items.map((item, idx) => (
        <motion.div
          key={item.label}
          ref={(el) => {
            if (el) cardsRef.current[idx] = el;
          }}
          className="relative overflow-hidden rounded-[26px] border border-white/10 bg-white/[0.03] p-5 shadow-[0_18px_45px_-30px_rgba(0,0,0,0.8)]"
        >
          <div
            className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${accentMap[item.accent]} opacity-70`}
          />
          <div className="relative z-10">
            <p className="text-[0.58rem] uppercase tracking-[0.5em] text-white/60">
              {item.label}
            </p>
            <div className="mt-3 flex items-end gap-2 text-white">
              <span
                data-stat-value
                data-target={item.value}
                className="text-[2.5rem] font-semibold leading-none"
              >
                {item.value}
              </span>
              <ArrowUpRight className="mb-1 h-5 w-5 text-white/60" />
            </div>
            <p className="text-xs text-white/50">{item.delta}</p>
          </div>
        </motion.div>
      ))}
    </div>
  );
}

