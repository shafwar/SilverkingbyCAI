"use client";

import useSWR from "swr";
import { motion, AnimatePresence } from "framer-motion";
import { Clock, MapPin } from "lucide-react";

import { fetcher } from "@/lib/fetcher";
import { AnimatedCard } from "./AnimatedCard";
import { LoadingSkeleton } from "./LoadingSkeleton";
import { DASHBOARD_USE_MOCKS, mockActivityLogs } from "@/lib/dashboard-mocks";

type ActivityItem = {
  id: number;
  serialCode: string;
  productName: string;
  scannedAt: string;
  ip?: string | null;
  location?: string | null;
};

type ActivityResponse = {
  logs: ActivityItem[];
};

type RecentActivityProps = {
  compact?: boolean;
};

export function RecentActivity({ compact = false }: RecentActivityProps) {
  const useMocks = DASHBOARD_USE_MOCKS;
  const { data, error, isLoading } = useSWR<ActivityResponse>(
    useMocks ? null : "/api/admin/logs?limit=6",
    fetcher,
    { refreshInterval: 15000 }
  );

  const logs = useMocks ? mockActivityLogs.logs : data?.logs ?? [];
  const loading = useMocks ? false : isLoading;
  const hasError = useMocks ? false : error;

  return (
    <AnimatedCard className={compact ? "max-h-[480px] overflow-hidden" : undefined}>
      <div className={compact ? "mb-4" : "mb-6"}>
        <p className="text-xs uppercase tracking-[0.35em] text-white/50">Live feed</p>
        <h3 className="mt-2 text-2xl font-semibold text-white">Recent scan activity</h3>
      </div>

      {loading && <LoadingSkeleton className="h-60 w-full" />}

      {hasError && <p className="text-sm text-red-400">Unable to load activity feed.</p>}

      <div
        className={`space-y-4 ${
          compact ? "max-h-[360px] overflow-y-auto pr-2 scrollbar-thin scrollbar-track-transparent" : ""
        }`}
      >
        <AnimatePresence>
          {logs.map((item, index) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -16 }}
              transition={{ duration: 0.3, delay: index * 0.05 }}
              className={`rounded-2xl border border-white/10 bg-white/5 ${compact ? "p-3" : "p-4"}`}
            >
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className={`text-white/70 ${compact ? "text-xs" : "text-sm"}`}>{item.productName}</p>
                  <p className={`font-semibold text-white ${compact ? "text-lg" : "text-xl"}`}>{item.serialCode}</p>
                </div>
                <div className="text-right text-xs uppercase tracking-[0.3em] text-[#FFD700]">
                  VERIFIED
                </div>
              </div>
              <div
                className={`mt-4 flex flex-wrap items-center gap-4 text-white/60 ${
                  compact ? "text-xs" : "text-sm"
                }`}
              >
                <span className="inline-flex items-center gap-2">
                  <Clock className="h-4 w-4 text-[#FFD700]" />
                  {new Date(item.scannedAt).toLocaleString()}
                </span>
                {item.location && (
                  <span className="inline-flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-[#C0C0C0]" />
                    {item.location}
                  </span>
                )}
                {item.ip && <span>IP {item.ip}</span>}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </AnimatedCard>
  );
}


