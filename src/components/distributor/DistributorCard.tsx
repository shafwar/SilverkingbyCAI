"use client";

import { motion } from "framer-motion";
import { MapPin, Phone, Store, ExternalLink } from "lucide-react";
import { useTranslations } from "next-intl";

export type DistributorItem = {
  id: number;
  distributorName: string;
  storeName: string;
  address: string;
  city: string;
  phone: string;
  mapLink: string | null;
  status: string;
};

type DistributorCardProps = {
  data: DistributorItem;
  index?: number;
};

const cardVariants = {
  initial: { opacity: 0, y: 24 },
  animate: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
      delay: i * 0.08,
      ease: [0.22, 1, 0.36, 1] as const,
    },
  }),
};

/**
 * Single distributor card. Use with a flex container and justify-center so that
 * 1 or 2 cards stay centered; max-w-[380px] prevents stretch on wide screens.
 */
export function DistributorCard({ data: d, index = 0 }: DistributorCardProps) {
  const t = useTranslations("distributor");

  return (
    <motion.article
      variants={cardVariants}
      initial="initial"
      whileInView="animate"
      viewport={{ once: true, amount: 0.2 }}
      custom={index}
      className="w-full max-w-[380px] rounded-2xl border border-white/10 bg-white/[0.04] p-6 md:p-8 shadow-lg shadow-black/20 transition-all duration-300 hover:border-white/20 hover:bg-white/[0.06] hover:shadow-xl hover:shadow-luxury-gold/5 flex flex-col"
    >
      <div className="flex items-center justify-between gap-2 mb-4">
        <span className="rounded-full bg-luxury-gold/15 px-3 py-1 text-xs font-medium text-luxury-gold border border-luxury-gold/30">
          {d.city}
        </span>
        <div className="rounded-lg bg-white/5 p-2 text-luxury-gold">
          <Store className="h-5 w-5" />
        </div>
      </div>
      <div className="flex-1 space-y-4">
        <div>
          <p className="text-[10px] uppercase tracking-widest text-white/50">
            {t("card.distributor")}
          </p>
          <p className="font-medium text-white mt-0.5">{d.distributorName}</p>
          <p className="text-sm text-white/70 mt-1">{d.storeName}</p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-widest text-white/50 mb-1">
            {t("card.address")}
          </p>
          <div className="flex items-start gap-2">
            <MapPin className="h-4 w-4 text-white/40 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-white/80 leading-relaxed">{d.address}</p>
          </div>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-widest text-white/50 mb-1">
            {t("card.phone")}
          </p>
          <a
            href={`tel:${d.phone.replace(/\s/g, "")}`}
            className="inline-flex items-center gap-2 text-sm text-luxury-gold/90 hover:text-luxury-gold transition-colors"
          >
            <Phone className="h-4 w-4" />
            {d.phone}
          </a>
        </div>
      </div>
      <div className="mt-6 pt-4 border-t border-white/10 flex flex-wrap gap-2">
        <a
          href={`tel:${d.phone.replace(/\s/g, "")}`}
          className="inline-flex items-center gap-2 rounded-full border border-luxury-gold/40 bg-luxury-gold/10 px-4 py-2 text-xs font-medium text-luxury-gold hover:bg-luxury-gold/20 transition-colors"
        >
          <Phone className="h-3.5 w-3.5" />
          {t("card.contact")}
        </a>
        {d.mapLink && (
          <a
            href={d.mapLink}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-full border border-white/20 px-4 py-2 text-xs font-medium text-white/80 hover:border-white/40 hover:text-white transition-colors"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            {t("card.viewMap")}
          </a>
        )}
      </div>
    </motion.article>
  );
}
