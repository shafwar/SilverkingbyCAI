"use client";

import { useMemo, useEffect, useState } from "react";
import { Link } from "@/i18n/routing";
import { Plus_Jakarta_Sans } from "next/font/google";
import Navbar from "@/components/layout/Navbar";
import { PageFooter } from "@/components/footer/PageFooter";
import { motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";

const fontJournal = Plus_Jakarta_Sans({
  weight: ["400", "500", "600", "700", "800"],
  subsets: ["latin"],
  variable: "--font-journal",
  display: "swap",
});

type Article = {
  slug: string;
  title: string;
  content: string;
  excerpt: string | null;
  heroImageUrl: string | null;
  publishedAt: string | null;
  /** Shown in header: editorial date, else publish date */
  displayDate: string | null;
};

type Props = {
  article: Article;
  locale: string;
  backLabel: string;
};

export default function JournalArticleClient({ article, locale, backLabel }: Props) {
  const hasHtml = /<[a-z][\s\S]*>/i.test(article.content);
  const [readProgress, setReadProgress] = useState(0);

  const formattedDate = useMemo(() => {
    const iso = article.displayDate ?? article.publishedAt;
    if (!iso) return null;
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return null;
    if (locale === "id") {
      const s = d.toLocaleDateString("id-ID", {
        day: "numeric",
        month: "long",
        year: "numeric",
      });
      return { label: s.toUpperCase(), iso };
    }
    const s = d.toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });
    return { label: s.toUpperCase(), iso };
  }, [article.displayDate, article.publishedAt, locale]);

  useEffect(() => {
    const onScroll = () => {
      const el = document.documentElement;
      const scrollTop = el.scrollTop || document.body.scrollTop;
      const scrollable = el.scrollHeight - el.clientHeight;
      const p = scrollable > 0 ? Math.min(100, Math.max(0, (scrollTop / scrollable) * 100)) : 0;
      setReadProgress(p);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  return (
    <div
      className={`min-h-screen bg-[#050505] text-white ${fontJournal.variable}`}
      style={{ fontFamily: "var(--font-journal), system-ui, sans-serif" }}
    >
      {/* Reading progress — thin bar at top */}
      <div
        className="pointer-events-none fixed left-0 right-0 top-0 z-[105] h-[2px] bg-white/[0.06]"
        aria-hidden
        role="presentation"
      >
        <div
          className="h-full bg-gradient-to-r from-[#c9a227] via-[#d4af37] to-[#e8c547] transition-[width] duration-150 ease-out"
          style={{ width: `${readProgress}%` }}
        />
      </div>

      <Navbar />

      <article className="relative z-10 pb-20 pt-[calc(5.25rem+env(safe-area-inset-top))] md:pb-28 md:pt-[5.75rem]">
        <div className="mx-auto w-full max-w-[min(100%,820px)] px-5 sm:px-8 lg:px-10">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            className="text-left"
          >
            {/* Back — minimal, does not compete with title */}
            <nav className="mb-8 md:mb-10" aria-label="Article">
              <Link
                href="/journal"
                className="group inline-flex items-center gap-1.5 text-[0.8125rem] font-medium text-white/45 transition-colors hover:text-luxury-gold/85"
              >
                <ArrowLeft
                  className="h-3.5 w-3.5 shrink-0 transition-transform group-hover:-translate-x-0.5"
                  strokeWidth={2}
                  aria-hidden
                />
                <span>{backLabel}</span>
              </Link>
            </nav>

            {/* Date — metadata above title */}
            {formattedDate && (
              <time
                dateTime={formattedDate.iso}
                className="mb-4 block text-[0.6875rem] font-semibold uppercase tracking-[0.2em] text-white/40 sm:text-[0.7rem] sm:tracking-[0.22em]"
              >
                {formattedDate.label}
              </time>
            )}

            {/* Title */}
            <h1 className="font-serif text-[clamp(2rem,5vw,3.25rem)] font-bold leading-[1.08] tracking-[-0.035em] text-white">
              {article.title}
            </h1>

            {/* Lead / excerpt */}
            {article.excerpt && (
              <p className="mt-8 max-w-[52ch] text-[1.125rem] font-normal leading-[1.65] text-white/72 sm:text-[1.1875rem] sm:leading-[1.7]">
                {article.excerpt}
              </p>
            )}

            {/* Hero */}
            {article.heroImageUrl && (
              <motion.figure
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.45, delay: 0.05, ease: [0.22, 1, 0.36, 1] }}
                className={`mx-auto w-full ${article.excerpt ? "mt-12 sm:mt-14" : "mt-10 sm:mt-12"}`}
              >
                <div className="overflow-hidden rounded-2xl bg-[#0c0c0c] shadow-[0_24px_64px_-12px_rgba(0,0,0,0.65)] sm:rounded-[1.25rem]">
                  <img
                    src={article.heroImageUrl}
                    alt=""
                    className="max-h-[min(72vh,560px)] w-full object-cover"
                    loading="eager"
                    decoding="async"
                  />
                </div>
              </motion.figure>
            )}

            {/* Body */}
            <div
              className={`journal-content mt-14 sm:mt-16 md:mt-[3.5rem] ${
                hasHtml ? "" : "whitespace-pre-wrap font-sans"
              }`}
            >
              {hasHtml ? (
                <div dangerouslySetInnerHTML={{ __html: article.content }} />
              ) : (
                article.content
              )}
            </div>
          </motion.div>
        </div>
      </article>

      <PageFooter />
    </div>
  );
}
