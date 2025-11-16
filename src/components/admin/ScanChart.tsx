"use client";

import { motion } from "framer-motion";

type DataPoint = {
  label: string;
  value: number;
};

export function ScanChart({ data }: { data: DataPoint[] }) {
  if (data.length === 0) {
    return (
      <div className="rounded-3xl border border-white/5 bg-white/[0.03] p-6 text-center text-white/40">
        No scan data yet
      </div>
    );
  }

  const max = Math.max(...data.map((d) => d.value), 1);

  return (
    <div className="rounded-3xl border border-white/5 bg-white/[0.03] p-4">
      <p className="mb-3 text-sm text-white/60">Scan performance</p>
      <div className="flex items-end gap-3">
        {data.map((item) => (
          <motion.div
            key={item.label}
            initial={{ height: 0 }}
            animate={{ height: `${(item.value / max) * 100}%` }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="flex-1 rounded-xl bg-gradient-to-t from-[#FFD700]/40 to-white/80 relative"
            style={{ minHeight: "40px" }}
          >
            <span className="absolute -top-6 left-1/2 -translate-x-1/2 text-xs font-semibold text-white">
              {item.value}
            </span>
            <span className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-[10px] uppercase tracking-wide text-white/50">
              {item.label}
            </span>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

