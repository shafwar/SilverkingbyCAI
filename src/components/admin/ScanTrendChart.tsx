"use client";

import { motion } from "framer-motion";

type TrendPoint = {
  label: string;
  value: number;
};

export function ScanTrendChart({ data }: { data: TrendPoint[] }) {
  const max = Math.max(...data.map((d) => d.value), 1);

  return (
    <div className="rounded-3xl border border-white/5 bg-gradient-to-br from-white/[0.05] to-white/[0.01] p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.5em] text-white/60">Seven-day scans</p>
          <h3 className="mt-1 text-2xl font-semibold text-white">Verification heat</h3>
        </div>
        <span className="rounded-full bg-white/5 px-3 py-1 text-xs text-white/60">
          Real-time feed
        </span>
      </div>
      <div className="mt-8 flex items-end gap-4">
        {data.map((point, index) => (
          <div key={point.label} className="flex flex-col items-center flex-1">
            <motion.div
              initial={{ height: 0 }}
              animate={{ height: `${(point.value / max) * 160}px` }}
              transition={{ duration: 0.7, delay: index * 0.05, ease: "easeOut" }}
              className="relative w-full rounded-2xl bg-gradient-to-t from-[#FFD700]/60 via-white/60 to-white/10 shadow-[0_15px_35px_-20px_rgba(255,215,0,0.8)]"
            >
              <span className="absolute -top-6 left-1/2 -translate-x-1/2 text-sm font-semibold text-white">
                {point.value}
              </span>
            </motion.div>
            <span className="mt-3 text-xs uppercase tracking-[0.4em] text-white/50">
              {point.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

