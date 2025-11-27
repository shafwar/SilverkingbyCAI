"use client";

import { motion } from "framer-motion";
import { useTranslations } from "next-intl";
import { Crown, QrCode } from "lucide-react";

type SpotlightProduct = {
  id: number;
  name: string;
  serialCode: string;
  scanCount: number;
  qrImageUrl: string;
};

export function ProductSpotlight({ products }: { products: SpotlightProduct[] }) {
  const t = useTranslations('admin.dashboard');
  
  if (products.length === 0) {
    return (
      <div className="rounded-3xl border border-white/5 bg-white/[0.02] p-6 text-white/60">
        {t('spotlight.noProducts')}
      </div>
    );
  }

  return (
    <div className="rounded-3xl border border-white/5 bg-white/[0.02] p-6">
      <div className="flex items-center gap-3 text-white">
        <Crown className="h-6 w-6 text-[#FFD700]" />
        <div>
          <p className="text-xs uppercase tracking-[0.5em] text-white/60">{t('spotlight.title')}</p>
          <h3 className="text-2xl font-semibold">{t('spotlight.subtitle')}</h3>
        </div>
      </div>
      <div className="mt-6 grid gap-5 md:grid-cols-3">
        {products.map((product, index) => (
          <motion.div
            key={product.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.06 }}
            className="rounded-2xl border border-white/10 bg-black/30 p-4"
          >
            <div className="flex items-center gap-3">
              <span className="rounded-2xl bg-white/10 p-2">
                <QrCode className="h-5 w-5 text-white" />
              </span>
              <div>
                <p className="font-semibold text-white">{product.name}</p>
                <p className="text-xs text-white/40 font-mono">{product.serialCode}</p>
              </div>
            </div>
            <div className="mt-4 text-sm text-white/80">
              <p className="text-xs uppercase tracking-[0.3em] text-white/40">{t('spotlight.scans')}</p>
              <p className="text-2xl font-semibold text-white">{product.scanCount}</p>
            </div>
            {product.qrImageUrl && (
              <div className="mt-4 rounded-xl border border-white/5 bg-black/40 p-3 text-center text-xs text-white/50">
                {t('spotlight.qrStored')} • <a href={product.qrImageUrl} className="text-white underline" target="_blank">{t('spotlight.open')}</a>
              </div>
            )}
          </motion.div>
        ))}
      </div>
    </div>
  );
}

