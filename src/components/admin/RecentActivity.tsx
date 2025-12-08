"use client";

import useSWR from "swr";
import { useTranslations } from "next-intl";
import { motion, AnimatePresence } from "framer-motion";
import { Clock, MapPin } from "lucide-react";

import { fetcher } from "@/lib/fetcher";
import { AnimatedCard } from "./AnimatedCard";
import { LoadingSkeleton } from "./LoadingSkeleton";

type ActivityItem = {
  id: string | number;
  serialCode: string;
  productName: string;
  scannedAt: string;
  ip?: string | null;
  location?: string | null;
  source?: "page1" | "page2";
};

type ActivityResponse = {
  logs: ActivityItem[];
};

type RecentActivityProps = {
  compact?: boolean;
};

export function RecentActivity({ compact = false }: RecentActivityProps) {
  const t = useTranslations('admin.activity');
  const { data, error, isLoading } = useSWR<ActivityResponse>(
    "/api/admin/logs?limit=6",
    fetcher,
    { refreshInterval: 15000 }
  );

  const logs = data?.logs ?? [];
  const loading = isLoading;
  const hasError = error;

  return (
    <AnimatedCard className={compact ? "max-h-[480px] overflow-hidden" : undefined}>
      <div className={compact ? "mb-4" : "mb-6"}>
        <p className="text-xs uppercase tracking-[0.35em] text-white/50">{t('liveFeed')}</p>
        <h3 className="mt-2 text-2xl font-semibold text-white">{t('recentScanActivity')}</h3>
      </div>

      {loading && <LoadingSkeleton className="h-60 w-full" />}

      {hasError && <p className="text-sm text-red-400">{t('unableToLoad')}</p>}

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
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className={`text-white/70 ${compact ? "text-xs" : "text-sm"} truncate`}>{item.productName}</p>
                    {item.source === "page2" && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30 flex-shrink-0">
                        Page 2
                      </span>
                    )}
                  </div>
                  <p className={`font-semibold text-white ${compact ? "text-lg" : "text-xl"}`}>{item.serialCode}</p>
                </div>
                <div className="text-right text-xs uppercase tracking-[0.3em] text-[#FFD700] flex-shrink-0">
                  {t('verified')}
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


