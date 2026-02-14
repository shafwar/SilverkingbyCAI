"use client";

import { useState, useEffect } from "react";
import { useTranslations, useLocale } from "next-intl";
import { motion } from "framer-motion";
import Navbar from "@/components/layout/Navbar";
import Link from "next/link";
import { MapPin, Phone, Store, ExternalLink, Instagram, ArrowRight } from "lucide-react";
import { getR2UrlClient } from "@/utils/r2-url";

type Distributor = {
  id: number;
  name: string;
  storeName: string | null;
  address: string;
  phone: string;
  mapUrl: string | null;
  city: string;
  displayOrder: number;
};

const HERO_IMAGE_PATH = "/images/DSC02998.JPG";

export default function DistributorsPageClient() {
  const t = useTranslations("distributors");
  const tNav = useTranslations("nav");
  const locale = useLocale();
  const [distributors, setDistributors] = useState<Distributor[]>([]);
  const [loading, setLoading] = useState(true);
  const [heroImageSrc, setHeroImageSrc] = useState<string>(HERO_IMAGE_PATH);

  useEffect(() => {
    setHeroImageSrc(getR2UrlClient(HERO_IMAGE_PATH));
  }, []);

  useEffect(() => {
    const apiUrl =
      typeof window !== "undefined"
        ? `${window.location.origin}/api/distributors`
        : "/api/distributors";
    fetch(apiUrl)
      .then((r) => r.json())
      .then((data) => {
        setDistributors(Array.isArray(data) ? data : []);
      })
      .catch(() => setDistributors([]))
      .finally(() => setLoading(false));
  }, []);

  const handleHeroImageError = () => {
    setHeroImageSrc(HERO_IMAGE_PATH);
  };

  return (
    <div className="min-h-screen bg-luxury-black text-white">
      <Navbar />

      {/* Hero Section - Silver King card image with fallback */}
      <section className="relative min-h-[70vh] flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 z-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={heroImageSrc}
            alt="Silver King - Premium precious metal"
            onError={handleHeroImageError}
            className="absolute inset-0 h-full w-full object-cover object-center brightness-[0.6]"
            sizes="100vw"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/50 to-black/90 z-10" />
          <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-black/80 to-transparent z-10" />
          <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-black/95 via-black/60 to-transparent z-10" />
        </div>

        <div className="relative z-20 mx-auto max-w-5xl px-6 py-24 md:py-32 text-center">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            className="mb-6"
          >
            <span className="inline-flex items-center gap-2 rounded-full border border-luxury-gold/40 bg-luxury-gold/10 px-5 py-2 text-xs uppercase tracking-[0.35em] text-luxury-gold/90 backdrop-blur-sm">
              <span className="h-1.5 w-1.5 rounded-full bg-luxury-gold" />
              {t("hero.badge")}
              <span className="h-1.5 w-1.5 rounded-full bg-luxury-gold" />
            </span>
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
            className="text-4xl font-semibold tracking-tight text-white sm:text-5xl md:text-6xl lg:text-7xl mb-6"
          >
            <span className="bg-gradient-to-r from-white via-luxury-silver to-white bg-clip-text text-transparent">
              {t("hero.title")}
            </span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="mx-auto max-w-2xl text-base md:text-lg text-white/80 leading-relaxed"
          >
            {t("hero.subtitle")}
          </motion.p>
        </div>
      </section>

      {/* Description Section */}
      <section className="relative py-20 md:py-28 px-6">
        <div className="absolute inset-0 bg-gradient-to-b from-[#0a0a0a] via-[#0d0d0d] to-[#0a0a0a]" />
        <div className="relative z-10 mx-auto max-w-4xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl md:text-4xl font-light tracking-tight text-white mb-6">
              {t("description.title")}{" "}
              <span className="bg-gradient-to-r from-luxury-gold to-luxury-lightGold bg-clip-text text-transparent">
                {t("description.titleBold")}
              </span>
            </h2>
            <p className="text-lg text-luxury-silver/80 leading-relaxed max-w-3xl mx-auto">
              {t("description.body")}
            </p>
          </motion.div>

          {/* Distributor Cards - consistent with Contact/About card style */}
          {loading ? (
            <div className="flex justify-center py-16">
              <div className="h-10 w-10 animate-spin rounded-full border-2 border-luxury-gold/30 border-t-luxury-gold" />
            </div>
          ) : distributors.length > 0 ? (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 max-w-6xl mx-auto">
              {distributors.map((d, i) => (
                <motion.div
                  key={d.id}
                  initial={{ opacity: 0, y: 24 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: i * 0.08 }}
                  className="group relative rounded-2xl border border-white/15 bg-gradient-to-br from-white/[0.08] via-white/[0.05] to-white/[0.03] p-6 md:p-8 backdrop-blur-xl shadow-[0_25px_80px_-20px_rgba(0,0,0,0.8)] transition-all duration-300 hover:border-luxury-gold/40 hover:shadow-[0_20px_60px_-30px_rgba(212,175,55,0.25)]"
                >
                  <div className="mb-5">
                    <span className="inline-block rounded-full bg-luxury-gold/15 px-3 py-1 text-xs font-medium text-luxury-gold uppercase tracking-wider">
                      {d.city}
                    </span>
                  </div>
                  <h3 className="text-xl font-semibold text-white mb-1">{d.name}</h3>
                  {d.storeName && (
                    <p className="text-sm text-white/60 flex items-center gap-2 mb-4">
                      <Store className="h-4 w-4 text-luxury-gold/70" />
                      {d.storeName}
                    </p>
                  )}
                  <div className="space-y-3 text-sm text-luxury-silver/80">
                    <p className="flex items-start gap-3">
                      <MapPin className="h-4 w-4 flex-shrink-0 mt-0.5 text-luxury-gold/70" />
                      <span>{d.address}</span>
                    </p>
                    <p className="flex items-center gap-3">
                      <Phone className="h-4 w-4 flex-shrink-0 text-luxury-gold/70" />
                      <a
                        href={`tel:${d.phone.replace(/\s/g, "")}`}
                        className="hover:text-luxury-gold transition-colors font-medium"
                      >
                        {d.phone}
                      </a>
                    </p>
                    {d.mapUrl && (
                      <a
                        href={d.mapUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 text-luxury-gold/90 hover:text-luxury-gold text-sm font-medium transition-colors"
                      >
                        <ExternalLink className="h-4 w-4" />
                        {t("viewOnMap")}
                      </a>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-white/20 bg-white/[0.02] p-16 text-center">
              <p className="text-white/50 text-lg">{t("empty")}</p>
              <Link
                href={`/${locale}/contact`}
                className="mt-6 inline-flex items-center gap-2 rounded-full border border-luxury-gold/40 bg-luxury-gold/10 px-6 py-3 text-sm font-medium text-luxury-gold hover:bg-luxury-gold/20 transition-colors"
              >
                {t("contactUs")}
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative py-20 md:py-24 px-6 border-t border-white/5">
        <div className="mx-auto max-w-4xl text-center">
          <h2 className="text-2xl md:text-3xl font-light text-white mb-4">
            {t("cta.title")}{" "}
            <span className="bg-gradient-to-r from-luxury-gold to-luxury-lightGold bg-clip-text text-transparent">
              {t("cta.titleBold")}
            </span>
          </h2>
          <p className="text-luxury-silver/70 mb-8">{t("cta.subtitle")}</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href={`/${locale}/contact`}
              className="inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-luxury-gold to-luxury-lightGold px-8 py-4 text-base font-semibold text-black hover:shadow-[0_20px_50px_-20px_rgba(212,175,55,0.5)] transition-all"
            >
              {t("cta.button")}
              <ArrowRight className="h-5 w-5" />
            </Link>
            <a
              href="https://www.instagram.com/silverkingofc/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 rounded-full border border-white/20 bg-white/5 px-8 py-4 text-base font-medium text-white hover:bg-white/10 transition-all"
            >
              <Instagram className="h-5 w-5" />
              {tNav("getInTouch")}
            </a>
          </div>
        </div>
      </section>

      {/* Footer links */}
      <footer className="border-t border-white/5 px-6 py-12">
        <div className="mx-auto max-w-6xl flex flex-col sm:flex-row items-center justify-between gap-6">
          <p className="text-xs text-white/40">
            © {new Date().getFullYear()} Silver King by CAI
          </p>
          <div className="flex gap-6 text-sm">
            <Link
              href={`/${locale}/products`}
              className="text-white/60 hover:text-white transition-colors"
            >
              {tNav("products")}
            </Link>
            <Link
              href={`/${locale}/about`}
              className="text-white/60 hover:text-white transition-colors"
            >
              {tNav("aboutUs")}
            </Link>
            <Link
              href={`/${locale}/contact`}
              className="text-white/60 hover:text-white transition-colors"
            >
              {tNav("getInTouch")}
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
