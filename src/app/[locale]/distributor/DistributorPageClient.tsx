"use client";

import Navbar from "@/components/layout/Navbar";
import { DistributorCard, type DistributorItem } from "@/components/distributor/DistributorCard";
import { motion } from "framer-motion";
import Image from "next/image";
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";

const HERO_FALLBACK_PATH = "/images/hero-fallback.jpg";

type DistributorPageClientProps = {
  initialDistributors?: DistributorItem[];
  heroImageUrl: string;
};

export default function DistributorPageClient({
  initialDistributors = [],
  heroImageUrl: initialHeroImageUrl,
}: DistributorPageClientProps) {
  const t = useTranslations("distributor");
  const [distributors, setDistributors] = useState<DistributorItem[]>(
    initialDistributors
  );
  const [loading, setLoading] = useState(initialDistributors.length === 0);
  const [heroImageError, setHeroImageError] = useState(false);

  useEffect(() => {
    if (initialDistributors.length > 0) {
      setLoading(false);
      return;
    }
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
  }, [initialDistributors.length]);

  const heroImageUrl = heroImageError
    ? HERO_FALLBACK_PATH
    : initialHeroImageUrl;
  const isExternalHero = heroImageUrl.startsWith("http");

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
            unoptimized={isExternalHero}
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
          <motion.div
            className="mb-8 md:mb-12"
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-xl md:text-2xl font-light text-white">
              {t("listTitle")}
            </h2>
            <p className="mt-2 text-sm md:text-base text-white/60 max-w-2xl">
              {t("listSubtitle")}
            </p>
            {!loading && distributors.length > 0 && (
              <p className="mt-1 text-xs uppercase tracking-widest text-white/40">
                {t("countDistributors", { count: distributors.length })}
              </p>
            )}
          </motion.div>
          {loading ? (
            <div className="flex flex-wrap justify-center gap-6 md:gap-8">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="w-full max-w-[380px] rounded-2xl border border-white/10 bg-white/5 p-6 md:p-8 h-72 animate-pulse"
                />
              ))}
            </div>
          ) : distributors.length === 0 ? (
            <motion.div
              className="text-center py-16 rounded-2xl border border-white/10 bg-white/[0.02]"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <p className="text-lg text-white/50">{t("noDistributors")}</p>
            </motion.div>
          ) : (
            <div className="flex flex-wrap justify-center gap-6 md:gap-8">
              {distributors.map((d, i) => (
                <DistributorCard key={d.id} data={d} index={i} />
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
