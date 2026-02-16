"use client";

import Navbar from "@/components/layout/Navbar";
import { motion } from "framer-motion";
import Image from "next/image";
import { getR2UrlClient } from "@/utils/r2-url";
import { MapPin, Phone, Store, ExternalLink } from "lucide-react";
import { useEffect, useState } from "react";
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

const HERO_IMAGE_PATH = "/images/DSC02998.JPG";
const HERO_FALLBACK_PATH = "/images/hero-fallback.jpg";

export default function DistributorPageClient() {
  const t = useTranslations("distributor");
  const [distributors, setDistributors] = useState<DistributorItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [heroImageError, setHeroImageError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const res = await fetch("/api/distributors");
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled && Array.isArray(data.distributors)) {
          setDistributors(data.distributors);
        }
      } catch (e) {
        if (!cancelled) setDistributors([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const heroImageUrl = heroImageError
    ? HERO_FALLBACK_PATH
    : getR2UrlClient(HERO_IMAGE_PATH);

  return (
    <div className="min-h-screen bg-luxury-black text-white selection:bg-luxury-gold/20 selection:text-white">
      <Navbar />

      {/* Hero Section */}
      <section className="relative min-h-[60vh] md:min-h-[70vh] flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0">
          <Image
            src={heroImageUrl}
            alt=""
            fill
            className="object-cover"
            sizes="100vw"
            priority
            onError={() => setHeroImageError(true)}
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/50 to-black/80" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_30%,rgba(0,0,0,0.6)_100%)]" />
        </div>
        <div className="relative z-10 w-full mx-auto max-w-[1400px] px-6 md:px-8 lg:px-12 text-center">
          <motion.h1
            className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-sans font-light tracking-tight text-white"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
          >
            {t("hero.title")}
          </motion.h1>
          <motion.p
            className="mt-4 md:mt-6 text-base sm:text-lg md:text-xl font-sans font-light text-white/90 max-w-2xl mx-auto"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.15, ease: "easeOut" }}
          >
            {t("hero.subtitle")}
          </motion.p>
        </div>
      </section>

      {/* Description Section */}
      <section className="relative py-12 md:py-16">
        <div className="mx-auto max-w-[1400px] px-6 md:px-8 lg:px-12">
          <motion.div
            className="max-w-3xl mx-auto text-center"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.6 }}
          >
            <p className="text-white/80 text-base md:text-lg leading-relaxed">
              {t("description")}
            </p>
          </motion.div>
        </div>
      </section>

      {/* Distributor Cards */}
      <section className="relative pb-20 md:pb-28">
        <div className="mx-auto max-w-[1400px] px-6 md:px-8 lg:px-12">
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="rounded-2xl border border-white/10 bg-white/5 p-6 md:p-8 h-64 animate-pulse"
                />
              ))}
            </div>
          ) : distributors.length === 0 ? (
            <motion.div
              className="text-center py-16 text-white/50"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <p className="text-lg">{t("noDistributors")}</p>
            </motion.div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
              {distributors.map((d, i) => (
                <motion.article
                  key={d.id}
                  variants={cardVariants}
                  initial="initial"
                  whileInView="animate"
                  viewport={{ once: true, amount: 0.2 }}
                  custom={i}
                  className="group rounded-2xl border border-white/10 bg-white/[0.04] p-6 md:p-8 shadow-lg shadow-black/20 transition-all duration-300 hover:border-white/20 hover:bg-white/[0.06] hover:shadow-xl hover:shadow-luxury-gold/5"
                >
                  <div className="space-y-4">
                    <div className="flex items-start gap-3">
                      <div className="rounded-lg bg-luxury-gold/10 p-2 text-luxury-gold">
                        <Store className="h-5 w-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-[10px] uppercase tracking-widest text-white/50">
                          {t("card.distributor")}
                        </p>
                        <p className="font-medium text-white mt-0.5">{d.distributorName}</p>
                        <p className="text-sm text-white/70 mt-1">{d.storeName}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <MapPin className="h-4 w-4 text-white/40 flex-shrink-0 mt-0.5" />
                      <p className="text-sm text-white/80 leading-relaxed">{d.address}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <Phone className="h-4 w-4 text-white/40 flex-shrink-0" />
                      <a
                        href={`tel:${d.phone.replace(/\s/g, "")}`}
                        className="text-sm text-luxury-gold/90 hover:text-luxury-gold transition-colors"
                      >
                        {d.phone}
                      </a>
                    </div>
                    {d.mapLink && (
                      <a
                        href={d.mapLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 text-sm text-white/70 hover:text-luxury-gold transition-colors"
                      >
                        <ExternalLink className="h-4 w-4" />
                        {t("card.map")}
                      </a>
                    )}
                  </div>
                </motion.article>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
