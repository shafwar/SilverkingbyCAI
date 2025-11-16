"use client";

import { motion } from "framer-motion";
import { ShieldCheck, Clock } from "lucide-react";

type TimelineEntry = {
  id: number;
  productName: string;
  serialCode: string;
  scannedAt: string;
  ip: string | null;
  userAgent: string | null;
};

export function RecentScansTimeline({ logs }: { logs: TimelineEntry[] }) {
  return (
    <div className="rounded-3xl border border-white/5 bg-white/[0.02] p-6">
      <p className="text-xs uppercase tracking-[0.5em] text-white/60">Recent Scans</p>
      <div className="mt-4 space-y-4">
        {logs.map((log, index) => (
          <motion.div
            key={log.id}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.05 }}
            className="rounded-2xl border border-white/10 bg-black/30 p-4"
          >
            <div className="flex items-center justify-between text-white">
              <div>
                <p className="font-semibold">{log.productName}</p>
                <p className="text-xs text-white/40 font-mono">{log.serialCode}</p>
              </div>
              <ShieldCheck className="h-5 w-5 text-[#FFD700]" />
            </div>
            <div className="mt-3 flex items-center gap-2 text-xs text-white/50">
              <Clock className="h-3.5 w-3.5" />
              {new Date(log.scannedAt).toLocaleString("id-ID")}
            </div>
            <p className="mt-2 text-[0.7rem] text-white/40">
              {log.ip ?? "Unknown IP"} • {log.userAgent?.slice(0, 60) ?? "Unknown agent"}
            </p>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

