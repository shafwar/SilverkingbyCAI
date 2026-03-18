"use client";

import { useEffect, useState, useRef } from "react";
import { useTranslations, useLocale } from "next-intl";
import { Link } from "@/i18n/routing";
import { Plus_Jakarta_Sans } from "next/font/google";
import Navbar from "@/components/layout/Navbar";
import { usePageSections } from "@/hooks/usePageSections";
import { useShouldLoadHeroVideo } from "@/hooks/useShouldLoadHeroVideo";
import { VideoLoadGuard, ImageLoadGuard } from "@/components/section-media/SectionMediaLoadGuard";
import { HeroEditPortal } from "@/components/layout/HeroEditPortal";
import { ScrollRevealSection } from "@/components/shared/ScrollRevealSection";
import { motion } from "framer-motion";
import { ArrowRight, BookOpen, Pencil, Plus, Trash2 } from "lucide-react";
import { PageFooter } from "@/components/footer/PageFooter";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useIsAdmin } from "@/hooks/useIsAdmin";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

const fontJournal = Plus_Jakarta_Sans({
  weight: ["400", "500", "600", "700", "800"],
  subsets: ["latin"],
  variable: "--font-journal",
  display: "swap",
});

type JournalItem = {
  slug: string;
  title: string;
  excerpt: string | null;
  heroImageUrl: string | null;
  publishedAt: string | null;
};

const LATEST_ARTICLES_LIMIT = 3;

type JournalPageClientProps = {
  /** Fallback hero media type when no CMS section. */
  initialHeroMediaType: "IMAGE" | "VIDEO";
  /** Fallback hero URL when no CMS section (same-origin). */
  initialHeroUrl: string;
};

type AdminJournalItem = {
  id: number;
  slug: string;
  titleId: string;
  titleEn: string;
  excerptId: string | null;
  excerptEn: string | null;
  heroImageR2Key: string | null;
  publishedAt: string | null;
};

export default function JournalPageClient({ initialHeroMediaType, initialHeroUrl }: JournalPageClientProps) {
  const t = useTranslations("journal");
  const locale = useLocale();
  const isAdmin = useIsAdmin();
  const [items, setItems] = useState<JournalItem[]>([]);
  const [adminItems, setAdminItems] = useState<AdminJournalItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [heroImageError, setHeroImageError] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const {
    sections: pageSections,
    loading: sectionsLoading,
    refetch: refetchPageSections,
  } = usePageSections("journal");

  const heroMediaType = (pageSections.hero?.url ? pageSections.hero?.mediaType?.toUpperCase() : initialHeroMediaType) as "IMAGE" | "VIDEO";
  const heroUrl = heroImageError ? initialHeroUrl : (pageSections.hero?.url ?? initialHeroUrl);
  const heroVersion = pageSections.hero?.version;
  const isFallbackHero = !pageSections.hero?.url;
  const shouldLoadHeroVideo = useShouldLoadHeroVideo();

  // Preload hero image for faster LCP when using fallback (same-origin URL we display)
  useEffect(() => {
    if (!isFallbackHero || heroMediaType !== "IMAGE") return;
    const link = document.createElement("link");
    link.rel = "preload";
    link.as = "image";
    link.href = initialHeroUrl;
    document.head.appendChild(link);
    return () => link.remove();
  }, [isFallbackHero, heroMediaType, initialHeroUrl]);

  useEffect(() => {
    let cancelled = false;
    const loadPublic = async () => {
      try {
        const r = await fetch(`/api/journal?locale=${locale}`);
        const data = await r.json();
        if (!cancelled && Array.isArray(data.items)) setItems(data.items);
      } catch {
        if (!cancelled) setItems([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    const loadAdmin = async () => {
      try {
        const r = await fetch(`/api/admin/journal`);
        if (!r.ok) return loadPublic();
        const data = await r.json();
        const list: AdminJournalItem[] = Array.isArray(data.items) ? data.items : [];
        if (!cancelled) setAdminItems(list);
        // Still show the same 3 cards but localized like public
        const mapped: JournalItem[] = list
          .filter((j) => !!j.publishedAt)
          .slice(0, LATEST_ARTICLES_LIMIT)
          .map((j) => ({
            slug: j.slug,
            title: (locale === "id" ? j.titleId : j.titleEn) || j.titleEn || j.titleId,
            excerpt: (() => {
              const s = locale === "id" ? j.excerptId : j.excerptEn;
              return s && s.trim() ? s : null;
            })(),
            heroImageUrl: null, // admin list returns r2Key; public cards should use public API for images
            publishedAt: j.publishedAt,
          }));
        // Prefer public API for heroImageUrl; keep titles from admin list
        if (!cancelled) setItems(mapped.length ? mapped : []);
      } catch {
        await loadPublic();
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    // Admin: we still load from public for images/SEO, but enable overlay controls via adminItems
    if (isAdmin) {
      loadAdmin();
    } else {
      loadPublic();
    }
    return () => {
      cancelled = true;
    };
  }, [locale, isAdmin]);

  const latestItems = items.slice(0, LATEST_ARTICLES_LIMIT);
  const adminBySlug = new Map(adminItems.map((j) => [j.slug, j]));

  const goAdminNew = () => {
    if (typeof window === "undefined") return;
    window.location.href = "/admin/journal?new=1";
  };
  const goAdminEdit = (id: number) => {
    if (typeof window === "undefined") return;
    window.location.href = `/admin/journal?edit=${id}`;
  };
  const deleteAdmin = async (id: number) => {
    if (!confirm("Delete this journal post?")) return;
    try {
      const res = await fetch(`/api/admin/journal/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Delete failed");
      // Soft refresh data
      setLoading(true);
      const r = await fetch(`/api/admin/journal`);
      const data = await r.json();
      const list: AdminJournalItem[] = Array.isArray(data.items) ? data.items : [];
      setAdminItems(list);
    } catch (e) {
      alert(e instanceof Error ? e.message : "Delete failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className={`min-h-screen w-full overflow-x-hidden bg-[#050505] text-white ${fontJournal.variable}`}
      style={{ fontFamily: "var(--font-journal), system-ui, sans-serif" }}
    >
      {/* Hero background — always show base gradient so never plain black; asset loads on top */}
      <div className="fixed inset-0 z-0 h-screen w-full overflow-hidden">
        <div
          className="absolute inset-0 z-0"
          style={{
            background:
              "linear-gradient(180deg, #080808 0%, #050505 50%, #030303 100%), radial-gradient(ellipse 80% 60% at 50% 40%, rgba(212,175,55,0.04) 0%, transparent 55%)",
          }}
        />
        <div className="absolute inset-0 z-10 overflow-hidden">
          {heroMediaType === "VIDEO" ? (
            <VideoLoadGuard
              key={heroUrl}
              url={heroUrl}
              version={heroVersion}
              forcePoster={!shouldLoadHeroVideo}
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
              key={heroUrl}
              url={heroUrl}
              version={heroVersion}
              containerClassName="absolute inset-0 h-full w-full"
              className="absolute inset-0 h-full w-full object-cover"
              style={{ objectFit: "cover" }}
              alt=""
              priority
              onError={() => setHeroImageError(true)}
            />
          )}
        </div>
        <div
          className="absolute inset-0 z-[11] pointer-events-none"
          style={{
            background:
              "linear-gradient(180deg, rgba(0,0,0,0.35) 0%, rgba(0,0,0,0.5) 50%, rgba(0,0,0,0.6) 100%)",
          }}
        />
        <div
          className="absolute inset-0 z-[11] pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse 70% 50% at 50% 40%, rgba(212,175,55,0.07) 0%, transparent 60%)",
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

      {/* Journal list — varied layout: featured + asymmetric grid */}
      <section ref={listRef} className="relative z-10 min-h-screen bg-gradient-to-b from-[#0a0a0a] to-[#050505] px-4 py-20 sm:px-6 md:px-8 lg:px-12">
        <div className="mx-auto max-w-5xl">
          <div className="mb-14 flex items-end justify-between gap-4">
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
              className="text-3xl font-semibold tracking-tight text-white sm:text-4xl"
            >
              {t("listHeading")}
            </motion.h2>

            {isAdmin && (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={goAdminNew}
                  className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.06] px-3 py-2 text-xs font-medium text-white/80 hover:bg-white/[0.1] hover:text-white"
                  aria-label="Add new journal post"
                  title="Add new journal post"
                >
                  <Plus className="h-4 w-4 text-luxury-gold/90" />
                  <span className="hidden sm:inline">New</span>
                </button>
                <a
                  href="/admin/journal"
                  className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3 py-2 text-xs font-medium text-white/70 hover:bg-white/[0.08] hover:text-white"
                  aria-label="Open Journal CMS"
                  title="Open Journal CMS"
                >
                  <Pencil className="h-4 w-4" />
                  <span className="hidden sm:inline">Manage</span>
                </a>
              </div>
            )}
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-24">
              <div className="h-10 w-10 animate-spin rounded-full border-2 border-luxury-gold/30 border-t-luxury-gold" />
            </div>
          ) : latestItems.length === 0 ? (
            <p className="py-16 text-center text-white/50">{t("noArticles")}</p>
          ) : (
            <div className="space-y-10 md:space-y-14">
              {/* Featured: first article — large horizontal card with gold accent */}
              <ScrollRevealSection direction="up" delay={0} as="div">
                <Link
                  href={`/journal/${latestItems[0].slug}`}
                  className="group block overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04] transition-all duration-300 hover:border-luxury-gold/25 hover:bg-white/[0.06] md:border-l-4 md:border-l-luxury-gold/40"
                >
                  <div className="grid gap-0 md:grid-cols-5 relative">
                    {isAdmin && adminBySlug.get(latestItems[0].slug) && (
                      <div className="absolute right-4 top-4 z-20 flex items-center gap-2">
                        <button
                          type="button"
                          className="rounded-full border border-white/10 bg-black/40 p-2 text-white/80 hover:bg-black/55 hover:text-white"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            goAdminEdit(adminBySlug.get(latestItems[0].slug)!.id);
                          }}
                          aria-label="Edit"
                          title="Edit"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          className="rounded-full border border-white/10 bg-black/40 p-2 text-red-300/80 hover:bg-red-500/20 hover:text-red-300"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            deleteAdmin(adminBySlug.get(latestItems[0].slug)!.id);
                          }}
                          aria-label="Delete"
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    )}
                    <div className="relative aspect-[2/1] md:col-span-2 md:aspect-auto md:min-h-[280px]">
                      {latestItems[0].heroImageUrl ? (
                        <img
                          src={latestItems[0].heroImageUrl}
                          alt=""
                          loading="lazy"
                          decoding="async"
                          className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-luxury-gold/15 to-luxury-gold/5">
                          <BookOpen className="h-14 w-14 text-luxury-gold/40" />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-r from-black/50 to-transparent md:from-transparent md:via-transparent md:to-black/30" />
                    </div>
                    <div className="flex flex-col justify-center p-6 md:col-span-3 md:p-10">
                      {latestItems[0].publishedAt && (
                        <time className="mb-2 text-xs font-medium uppercase tracking-wider text-luxury-gold/80">
                          {new Date(latestItems[0].publishedAt).toLocaleDateString(locale === "id" ? "id-ID" : "en-GB", {
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                          })}
                        </time>
                      )}
                      <h3 className="mb-3 text-xl font-semibold text-white transition-colors group-hover:text-luxury-gold sm:text-2xl md:text-3xl">
                        {latestItems[0].title}
                      </h3>
                      {latestItems[0].excerpt && (
                        <p className="mb-5 line-clamp-3 text-sm text-white/70 md:text-base">{latestItems[0].excerpt}</p>
                      )}
                      <span className="inline-flex items-center gap-2 text-sm font-medium text-luxury-gold">
                        {t("readMore")}
                        <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                      </span>
                    </div>
                  </div>
                </Link>
              </ScrollRevealSection>

              {/* Second row: two cards side by side (or one full-width when only 2 articles) */}
              {latestItems.length > 1 && (
                <div className={`grid gap-8 md:gap-10 ${latestItems.length === 2 ? "md:grid-cols-1" : "md:grid-cols-2"}`}>
                  {/* Card 2: image on top, content below */}
                  <ScrollRevealSection direction="up" delay={0.08} as="div" className={latestItems.length === 2 ? "max-w-xl" : ""}>
                    <Link
                      href={`/journal/${latestItems[1].slug}`}
                      className="group block overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] transition-all duration-300 hover:border-luxury-gold/25 hover:bg-white/[0.06]"
                    >
                      <div className="relative aspect-[16/10] w-full">
                        {isAdmin && adminBySlug.get(latestItems[1].slug) && (
                          <div className="absolute right-3 top-3 z-20 flex items-center gap-2">
                            <button
                              type="button"
                              className="rounded-full border border-white/10 bg-black/40 p-2 text-white/80 hover:bg-black/55 hover:text-white"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                goAdminEdit(adminBySlug.get(latestItems[1].slug)!.id);
                              }}
                              aria-label="Edit"
                              title="Edit"
                            >
                              <Pencil className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              className="rounded-full border border-white/10 bg-black/40 p-2 text-red-300/80 hover:bg-red-500/20 hover:text-red-300"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                deleteAdmin(adminBySlug.get(latestItems[1].slug)!.id);
                              }}
                              aria-label="Delete"
                              title="Delete"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        )}
                        {latestItems[1].heroImageUrl ? (
                          <img
                            src={latestItems[1].heroImageUrl}
                            alt=""
                            loading="lazy"
                            decoding="async"
                            className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                          />
                        ) : (
                          <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-luxury-gold/10 to-luxury-gold/5">
                            <BookOpen className="h-12 w-12 text-luxury-gold/40" />
                          </div>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                      </div>
                      <div className="p-5 sm:p-6">
                        {latestItems[1].publishedAt && (
                          <time className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-luxury-gold/80">
                            {new Date(latestItems[1].publishedAt).toLocaleDateString(locale === "id" ? "id-ID" : "en-GB", {
                              year: "numeric",
                              month: "long",
                              day: "numeric",
                            })}
                          </time>
                        )}
                        <h3 className="mb-2 text-lg font-semibold text-white transition-colors group-hover:text-luxury-gold sm:text-xl">
                          {latestItems[1].title}
                        </h3>
                        {latestItems[1].excerpt && (
                          <p className="mb-3 line-clamp-2 text-sm text-white/65">{latestItems[1].excerpt}</p>
                        )}
                        <span className="inline-flex items-center gap-1.5 text-sm font-medium text-luxury-gold">
                          {t("readMore")}
                          <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
                        </span>
                      </div>
                    </Link>
                  </ScrollRevealSection>

                  {/* Card 3: image on right (horizontal layout) — different from card 2 */}
                  {latestItems.length > 2 && (
                    <ScrollRevealSection direction="up" delay={0.14} as="div">
                      <Link
                        href={`/journal/${latestItems[2].slug}`}
                        className="group block overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] transition-all duration-300 hover:border-luxury-gold/25 hover:bg-white/[0.06]"
                      >
                        <div className="flex flex-col sm:flex-row sm:min-h-[200px]">
                          <div className="flex-1 p-5 sm:p-6 sm:order-1 sm:min-w-0">
                            {latestItems[2].publishedAt && (
                              <time className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-luxury-gold/80">
                                {new Date(latestItems[2].publishedAt).toLocaleDateString(locale === "id" ? "id-ID" : "en-GB", {
                                  year: "numeric",
                                  month: "long",
                                  day: "numeric",
                                })}
                              </time>
                            )}
                            <h3 className="mb-2 text-lg font-semibold text-white transition-colors group-hover:text-luxury-gold sm:text-xl">
                              {latestItems[2].title}
                            </h3>
                            {latestItems[2].excerpt && (
                              <p className="mb-3 line-clamp-2 text-sm text-white/65">{latestItems[2].excerpt}</p>
                            )}
                            <span className="inline-flex items-center gap-1.5 text-sm font-medium text-luxury-gold">
                              {t("readMore")}
                              <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
                            </span>
                          </div>
                          <div className="relative h-40 w-full flex-shrink-0 sm:h-auto sm:w-[45%] sm:min-h-[200px]">
                            {isAdmin && adminBySlug.get(latestItems[2].slug) && (
                              <div className="absolute right-3 top-3 z-20 flex items-center gap-2">
                                <button
                                  type="button"
                                  className="rounded-full border border-white/10 bg-black/40 p-2 text-white/80 hover:bg-black/55 hover:text-white"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    goAdminEdit(adminBySlug.get(latestItems[2].slug)!.id);
                                  }}
                                  aria-label="Edit"
                                  title="Edit"
                                >
                                  <Pencil className="h-4 w-4" />
                                </button>
                                <button
                                  type="button"
                                  className="rounded-full border border-white/10 bg-black/40 p-2 text-red-300/80 hover:bg-red-500/20 hover:text-red-300"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    deleteAdmin(adminBySlug.get(latestItems[2].slug)!.id);
                                  }}
                                  aria-label="Delete"
                                  title="Delete"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </div>
                            )}
                            {latestItems[2].heroImageUrl ? (
                              <img
                                src={latestItems[2].heroImageUrl}
                                alt=""
                                loading="lazy"
                                decoding="async"
                                className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                              />
                            ) : (
                              <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-bl from-luxury-gold/10 to-luxury-gold/5">
                                <BookOpen className="h-10 w-10 text-luxury-gold/40" />
                              </div>
                            )}
                            <div className="absolute inset-0 bg-gradient-to-l from-black/40 to-transparent sm:from-transparent sm:via-transparent sm:to-black/20" />
                          </div>
                        </div>
                      </Link>
                    </ScrollRevealSection>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </section>

      <PageFooter />
    </div>
  );
}
