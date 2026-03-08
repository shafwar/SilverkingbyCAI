"use client";

import { motion } from "framer-motion";
import { MapPin, Phone, Store, ExternalLink, Pencil } from "lucide-react";
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
  showEditButton?: boolean;
  onEdit?: (data: DistributorItem) => void;
};

const cardVariants = {
  initial: { opacity: 0, y: 28 },
  animate: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.55,
      delay: i * 0.08,
      ease: [0.22, 1, 0.36, 1] as const,
    },
  }),
};

/**
 * Single distributor card – classy layout with clear hierarchy and readable info.
 */
export function DistributorCard({
  data: d,
  index = 0,
  showEditButton = false,
  onEdit,
}: DistributorCardProps) {
  const t = useTranslations("distributor");

  return (
    <motion.article
      variants={cardVariants}
      initial="initial"
      whileInView="animate"
      viewport={{ once: true, amount: 0.2 }}
      custom={index}
      className="group relative w-full max-w-[400px] rounded-2xl overflow-hidden transition-all duration-300 hover:shadow-[0_24px_48px_-12px_rgba(0,0,0,0.5),0_0_0_1px_rgba(212,175,55,0.08)]"
    >
      {/* Gold accent line top + gradient border */}
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-luxury-gold/60 to-transparent opacity-90" />
      <div
        className="absolute inset-0 rounded-2xl p-[1px] opacity-100 transition-opacity duration-300 group-hover:opacity-100"
        style={{
          background:
            "linear-gradient(160deg, rgba(212,175,55,0.2) 0%, rgba(255,255,255,0.04) 40%, rgba(212,175,55,0.12) 100%)",
        }}
      >
        <div className="absolute inset-[1px] rounded-2xl bg-gradient-to-b from-[#0f0f0f] to-[#080808]" />
      </div>
      {/* Subtle inner glow on hover */}
      <div
        className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 90% 50% at 50% 0%, rgba(212,175,55,0.04) 0%, transparent 55%)",
        }}
      />

      <div className="relative flex flex-col flex-1 p-6 md:p-8 z-10">
        {/* Header: city + store icon / edit */}
        <div className="flex items-start justify-between gap-3 mb-6">
          <span className="inline-flex items-center gap-2 rounded-full bg-luxury-gold/15 border border-luxury-gold/25 px-4 py-2 text-sm font-semibold tracking-wide text-luxury-gold">
            <span className="h-1.5 w-1.5 rounded-full bg-luxury-gold/80" />
            {d.city}
          </span>
          <div className="flex items-center gap-1">
            {showEditButton && onEdit && (
              <button
                type="button"
                onClick={() => onEdit(d)}
                className="rounded-xl border border-white/15 p-2.5 text-white/60 hover:bg-white/10 hover:text-white hover:border-white/25 transition-all duration-200"
                title={t("card.edit")}
                aria-label={t("card.edit")}
              >
                <Pencil className="h-4 w-4" />
              </button>
            )}
            <div className="rounded-xl bg-white/5 border border-white/10 p-2.5 text-luxury-gold/80">
              <Store className="h-4 w-4" />
            </div>
          </div>
        </div>

        {/* Primary: distributor + store name – strong hierarchy */}
        <div className="mb-6">
          <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-white/45 mb-1.5">
            {t("card.distributor")}
          </p>
          <h3 className="text-xl md:text-2xl font-bold tracking-tight text-white leading-tight">
            {d.distributorName}
          </h3>
          <p className="text-base text-white/75 mt-1.5 font-medium">
            {d.storeName}
          </p>
        </div>

        {/* Address block */}
        <div className="mb-5">
          <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-white/45 mb-2">
            {t("card.address")}
          </p>
          <div className="flex gap-3">
            <MapPin className="h-4 w-4 text-luxury-gold/50 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-white/85 leading-relaxed">{d.address}</p>
          </div>
        </div>

        {/* Phone block */}
        <div className="mb-6">
          <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-white/45 mb-2">
            {t("card.phone")}
          </p>
          <a
            href={`tel:${d.phone.replace(/\s/g, "")}`}
            className="inline-flex items-center gap-2.5 text-base font-medium text-luxury-gold/95 hover:text-luxury-gold transition-colors duration-200"
          >
            <Phone className="h-4 w-4" />
            {d.phone}
          </a>
        </div>

        {/* Actions */}
        <div className="mt-auto pt-5 border-t border-white/10 flex flex-wrap gap-3">
          <a
            href={`tel:${d.phone.replace(/\s/g, "")}`}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-luxury-gold/40 bg-luxury-gold/10 px-5 py-3 text-sm font-semibold text-luxury-gold hover:bg-luxury-gold/20 hover:border-luxury-gold/50 transition-all duration-200"
          >
            <Phone className="h-4 w-4" />
            {t("card.contact")}
          </a>
          {d.mapLink && (
            <a
              href={d.mapLink}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/20 bg-white/[0.06] px-5 py-3 text-sm font-medium text-white/90 hover:bg-white/10 hover:border-luxury-gold/30 hover:text-luxury-gold/90 transition-all duration-200"
            >
              <ExternalLink className="h-4 w-4" />
              {t("card.viewMap")}
            </a>
          )}
        </div>
      </div>
    </motion.article>
  );
}
