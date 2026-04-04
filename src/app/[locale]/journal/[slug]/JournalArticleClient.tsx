"use client";

import { useMemo } from "react";
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

  const formattedDate = useMemo(() => {
    const iso = article.displayDate ?? article.publishedAt;
    if (!iso) return null;
    const d = new Date(iso);
    const loc = locale === "id" ? "id-ID" : "en-GB";
    const day = d.toLocaleDateString(loc, { day: "numeric" });
    const month = d.toLocaleDateString(loc, { month: "long" });
    const year = d.toLocaleDateString(loc, { year: "numeric" });
    return { line1: `${day} ${month}`.toUpperCase(), year, iso };
  }, [article.displayDate, article.publishedAt, locale]);

  return (
    <div
      className={`min-h-screen bg-[#030303] text-white ${fontJournal.variable}`}
      style={{ fontFamily: "var(--font-journal), system-ui, sans-serif" }}
    >
      <Navbar />

      <article className="relative z-10 pb-16 pt-[calc(5.5rem+env(safe-area-inset-top))] md:pb-24 md:pt-24">
        <div className="mx-auto max-w-[680px] px-4 sm:px-6 lg:max-w-[720px] lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          >
            <Link
              href="/journal"
              className="mb-8 inline-flex min-h-[44px] items-center gap-2 text-[0.8125rem] font-semibold text-luxury-gold/90 transition-colors hover:text-luxury-lightGold"
            >
              <ArrowLeft className="h-4 w-4 shrink-0" strokeWidth={2} />
              {backLabel}
            </Link>

            {formattedDate && (
              <div className="mb-5 flex flex-wrap items-baseline gap-x-3 gap-y-1 border-b border-white/[0.07] pb-5">
                <time
                  dateTime={formattedDate.iso}
                  className="text-[0.6875rem] font-bold uppercase tracking-[0.22em] text-luxury-gold tabular-nums sm:text-[0.7rem]"
                >
                  {formattedDate.line1}
                </time>
                <span className="hidden h-1 w-1 rounded-full bg-luxury-gold/40 sm:inline" aria-hidden />
                <time
                  dateTime={formattedDate.iso}
                  className="text-[0.6875rem] font-semibold uppercase tracking-[0.28em] text-white/45 tabular-nums"
                >
                  {formattedDate.year}
                </time>
              </div>
            )}

            <h1 className="text-[1.875rem] font-black leading-[1.12] tracking-[-0.03em] text-white sm:text-[2.25rem] md:text-[2.75rem] md:leading-[1.1]">
              {article.title}
            </h1>

            {article.excerpt && (
              <p className="mt-6 border-l-[3px] border-luxury-gold/50 bg-white/[0.03] py-4 pl-5 pr-4 text-[0.9375rem] font-medium leading-relaxed text-white/80 sm:text-base">
                {article.excerpt}
              </p>
            )}

            {article.heroImageUrl && (
              <motion.figure
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
                className="mt-10 overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0a0a0a] shadow-[0_20px_50px_rgba(0,0,0,0.5)] ring-1 ring-white/[0.04]"
              >
                <img
                  src={article.heroImageUrl}
                  alt=""
                  className="max-h-[min(72vh,560px)] w-full object-cover"
                  loading="eager"
                  decoding="async"
                />
              </motion.figure>
            )}

            <div
              className={`journal-content mt-12 border-t border-white/[0.08] pt-12 text-[0.9375rem] leading-[1.8] text-white/85 sm:text-base ${
                hasHtml
                  ? "prose prose-invert max-w-none prose-headings:scroll-mt-24 prose-headings:font-bold prose-headings:tracking-tight prose-headings:text-white prose-p:mb-5 prose-p:leading-relaxed prose-a:font-medium prose-a:text-luxury-gold prose-a:no-underline hover:prose-a:underline prose-strong:text-white prose-li:marker:text-luxury-gold/60"
                  : "whitespace-pre-wrap font-sans"
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
