"use client";

import { useEffect, useState, useRef } from "react";
import { useTranslations, useLocale } from "next-intl";
import { Link } from "@/i18n/routing";
import Navbar from "@/components/layout/Navbar";
import { usePageSections } from "@/hooks/usePageSections";
import { VideoLoadGuard, ImageLoadGuard } from "@/components/section-media/SectionMediaLoadGuard";
import { HeroEditPortal } from "@/components/layout/HeroEditPortal";
import { ScrollRevealSection } from "@/components/shared/ScrollRevealSection";
import { getR2UrlClient } from "@/utils/r2-url";
import { motion } from "framer-motion";
import { ArrowRight, BookOpen } from "lucide-react";
import { PageFooter } from "@/components/footer/PageFooter";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

type JournalItem = {
  slug: string;
  title: string;
  excerpt: string | null;
  heroImageUrl: string | null;
  publishedAt: string | null;
};

const HERO_FALLBACK = "/images/hero-fallback.jpg";

export default function JournalPageClient() {
  const t = useTranslations("journal");
  const locale = useLocale();
  const [items, setItems] = useState<JournalItem[]>([]);
  const [loading, setLoading] = useState(true);
  const listRef = useRef<HTMLDivElement>(null);
  const {
    sections: pageSections,
    loading: sectionsLoading,
    refetch: refetchPageSections,
  } = usePageSections("journal");

  const heroMediaType = pageSections.hero?.mediaType?.toUpperCase() ?? "IMAGE";
  const heroUrl = pageSections.hero?.url ?? getR2UrlClient(HERO_FALLBACK);
  const heroVersion = pageSections.hero?.version;

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/journal?locale=${locale}`)
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled && Array.isArray(data.items)) setItems(data.items);
      })
      .catch(() => {
        if (!cancelled) setItems([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [locale]);

  return (
    <div className="min-h-screen w-full overflow-x-hidden bg-[#050505] text-white">
      {/* Hero background */}
      <div className="fixed inset-0 z-0 h-screen w-full overflow-hidden">
        <div className="absolute inset-0 z-0 bg-[#050505]" />
        <div className="absolute inset-0 z-10 overflow-hidden">
          {heroMediaType === "VIDEO" ? (
            <VideoLoadGuard
              url={heroUrl}
              version={heroVersion}
              containerClassName="absolute inset-0 h-full w-full"
              className="absolute inset-0 h-full w-full object-cover"
              style={{ objectFit: "cover" }}
              autoPlay
              loop
              muted
              playsInline
              preload="auto"
            />
          ) : (
            <ImageLoadGuard
              url={heroUrl}
              version={heroVersion}
              containerClassName="absolute inset-0 h-full w-full"
              className="absolute inset-0 h-full w-full object-cover"
              style={{ objectFit: "cover" }}
              alt=""
              priority
            />
          )}
        </div>
        <div
          className="absolute inset-0 z-[11] pointer-events-none"
          style={{
            background:
              "linear-gradient(180deg, rgba(0,0,0,0.4) 0%, rgba(0,0,0,0.5) 50%, rgba(0,0,0,0.6) 100%)",
          }}
        />
        <div
          className="absolute inset-0 z-[11] pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse 70% 50% at 50% 40%, rgba(212,175,55,0.06) 0%, transparent 60%)",
          }}
        />
      </div>

      <Navbar />

      <HeroEditPortal
        page="journal"
        section="hero"
        type="image"
        onUploadDone={refetchPageSections}
        editLabel="Edit hero"
      />

      {/* Hero section */}
      <section className="relative flex min-h-screen flex-col justify-center px-4 pt-24 pb-16 sm:px-6 md:px-8">
        <motion.div
          initial={{ opacity: 0, y: 32 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          className="relative z-20 mx-auto max-w-4xl text-center"
        >
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-luxury-gold/30 bg-luxury-gold/10 px-4 py-1.5 text-sm text-luxury-gold">
            <BookOpen className="h-4 w-4" />
            {t("hero.eyebrow")}
          </div>
          <h1 className="font-serif text-4xl font-bold tracking-tight text-white drop-shadow-[0_2px_20px_rgba(0,0,0,0.6)] sm:text-5xl md:text-6xl lg:text-7xl">
            {t("hero.title")}
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-white/90 drop-shadow-[0_1px_10px_rgba(0,0,0,0.5)] sm:text-xl">
            {t("hero.subtitle")}
          </p>
        </motion.div>
        <div className="absolute bottom-8 left-1/2 z-20 -translate-x-1/2">
          <motion.div
            animate={{ y: [0, 8, 0] }}
            transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
            className="h-8 w-5 rounded-full border border-white/40 flex items-start justify-center pt-2"
          >
            <div className="h-1.5 w-1 rounded-full bg-white/70" />
          </motion.div>
        </div>
      </section>

      {/* Journal list */}
      <section ref={listRef} className="relative z-10 min-h-screen bg-gradient-to-b from-[#0a0a0a] to-[#050505] px-4 py-20 sm:px-6 md:px-8 lg:px-12">
        <div className="mx-auto max-w-4xl">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className="mb-12 font-serif text-3xl font-semibold text-white sm:text-4xl"
          >
            {t("listHeading")}
          </motion.h2>

          {loading ? (
            <div className="flex items-center justify-center py-24">
              <div className="h-10 w-10 animate-spin rounded-full border-2 border-luxury-gold/30 border-t-luxury-gold" />
            </div>
          ) : items.length === 0 ? (
            <p className="py-16 text-center text-white/50">{t("noArticles")}</p>
          ) : (
            <ul className="space-y-10">
              {items.map((post, index) => (
                <li key={post.slug}>
                  <ScrollRevealSection direction="up" delay={index * 0.08} as="div">
                    <Link
                      href={`/journal/${post.slug}`}
                      className="group block overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] transition-all duration-300 hover:border-luxury-gold/30 hover:bg-white/[0.06]"
                    >
                      <div className="grid gap-0 sm:grid-cols-5">
                        <div className="relative aspect-[16/10] sm:col-span-2 sm:aspect-auto sm:min-h-[220px]">
                          {post.heroImageUrl ? (
                            <img
                              src={post.heroImageUrl}
                              alt=""
                              className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                            />
                          ) : (
                            <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-luxury-gold/10 to-luxury-gold/5">
                              <BookOpen className="h-12 w-12 text-luxury-gold/40" />
                            </div>
                          )}
                          <div className="absolute inset-0 bg-gradient-to-r from-black/40 to-transparent sm:from-transparent sm:via-transparent sm:to-black/20" />
                        </div>
                        <div className="flex flex-col justify-center p-6 sm:col-span-3 sm:p-8">
                          {post.publishedAt && (
                            <time className="mb-2 text-xs font-medium uppercase tracking-wider text-luxury-gold/80">
                              {new Date(post.publishedAt).toLocaleDateString(locale === "id" ? "id-ID" : "en-GB", {
                                year: "numeric",
                                month: "long",
                                day: "numeric",
                              })}
                            </time>
                          )}
                          <h3 className="mb-2 font-serif text-xl font-semibold text-white transition-colors group-hover:text-luxury-gold sm:text-2xl">
                            {post.title}
                          </h3>
                          {post.excerpt && (
                            <p className="mb-4 line-clamp-2 text-sm text-white/70">{post.excerpt}</p>
                          )}
                          <span className="inline-flex items-center gap-2 text-sm font-medium text-luxury-gold">
                            {t("readMore")}
                            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                          </span>
                        </div>
                      </div>
                    </Link>
                  </ScrollRevealSection>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <PageFooter />
    </div>
  );
}
