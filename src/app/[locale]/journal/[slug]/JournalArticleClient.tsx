"use client";

import { Link } from "@/i18n/routing";
import { Plus_Jakarta_Sans } from "next/font/google";
import Navbar from "@/components/layout/Navbar";
import { PageFooter } from "@/components/footer/PageFooter";
import { motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import { useState } from "react";
import { VideoLoadGuard, ImageLoadGuard } from "@/components/section-media/SectionMediaLoadGuard";
import { useShouldLoadHeroVideo } from "@/hooks/useShouldLoadHeroVideo";

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
};

type Props = {
  article: Article;
  locale: string;
  backLabel: string;
};

export default function JournalArticleClient({ article, locale, backLabel }: Props) {
  const hasHtml = /<[a-z][\s\S]*>/i.test(article.content);

  const shouldLoadHeroVideo = useShouldLoadHeroVideo();
  const [heroVideoError, setHeroVideoError] = useState(false);
  const [, setHeroImageError] = useState(false);

  const videoUrl = "/videos/hero/Jurnal%20Silverking.mp4";
  const posterUrl = "/api/hero-image?page=journal";
  const videoPreload = shouldLoadHeroVideo ? "auto" : "metadata";

  return (
    <div
      className={`min-h-screen bg-[#050505] text-white ${fontJournal.variable}`}
      style={{ fontFamily: "var(--font-journal), system-ui, sans-serif" }}
    >
      {/* Consistent background video for all journal pages */}
      <div className="fixed inset-0 z-0 h-screen w-full overflow-hidden">
        <div
          className="absolute inset-0 z-0"
          style={{
            background:
              "linear-gradient(180deg, #080808 0%, #050505 50%, #030303 100%), radial-gradient(ellipse 80% 60% at 50% 40%, rgba(212,175,55,0.04) 0%, transparent 55%)",
          }}
        />
        <div className="absolute inset-0 z-10 overflow-hidden">
          <ImageLoadGuard
            key={`journal-poster:${posterUrl}`}
            url={posterUrl}
            containerClassName="absolute inset-0 h-full w-full"
            className="absolute inset-0 h-full w-full object-cover"
            style={{ objectFit: "cover" }}
            alt=""
            priority
            onError={() => setHeroImageError(true)}
          />
          {!heroVideoError && (
            <div className="absolute inset-0">
              <VideoLoadGuard
                key={videoUrl}
                url={videoUrl}
                containerClassName="absolute inset-0 h-full w-full"
                className="absolute inset-0 h-full w-full object-cover"
                style={{ objectFit: "cover" }}
                autoPlay
                loop
                muted
                playsInline
                preload={videoPreload}
                onError={() => setHeroVideoError(true)}
              />
            </div>
          )}
        </div>
        <div
          className="absolute inset-0 z-[11] pointer-events-none"
          style={{
            background:
              "linear-gradient(180deg, rgba(0,0,0,0.35) 0%, rgba(0,0,0,0.55) 60%, rgba(5,5,5,1) 100%)",
          }}
        />
      </div>

      <Navbar />

      <article className="relative z-10 pt-24 pb-20">
        {/* Hero image */}
        {article.heroImageUrl && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6 }}
            className="relative h-[50vh] min-h-[280px] w-full overflow-hidden rounded-3xl border border-white/10 bg-black/20"
          >
            <img
              src={article.heroImageUrl}
              alt=""
              className="absolute inset-0 h-full w-full object-cover"
            />
            <div
              className="absolute inset-0"
              style={{
                background:
                  "linear-gradient(180deg, rgba(0,0,0,0.3) 0%, rgba(0,0,0,0.6) 60%, rgba(5,5,5,1) 100%)",
              }}
            />
          </motion.div>
        )}

        <div className="mx-auto max-w-3xl px-4 sm:px-6 md:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="pt-8"
          >
            <Link
              href="/journal"
              className="mb-8 inline-flex items-center gap-2 text-sm font-medium text-luxury-gold hover:text-luxury-gold/80"
            >
              <ArrowLeft className="h-4 w-4" />
              {backLabel}
            </Link>

            {article.publishedAt && (
              <time className="mb-4 block text-xs font-medium uppercase tracking-wider text-luxury-gold/80">
                {new Date(article.publishedAt).toLocaleDateString(locale === "id" ? "id-ID" : "en-GB", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </time>
            )}

            <h1 className="text-3xl font-extrabold tracking-tight text-white drop-shadow-[0_10px_35px_rgba(0,0,0,0.65)] sm:text-4xl md:text-5xl">
              {article.title}
            </h1>

            {article.excerpt && (
              <p className="mt-4 text-lg text-white/80">{article.excerpt}</p>
            )}

            <div
              className="journal-content mt-10 rounded-3xl border border-white/10 bg-white/[0.03] p-6 pt-8 text-white/90 sm:p-8"
              style={{
                lineHeight: 1.75,
              }}
            >
              {hasHtml ? (
                <div
                  className="prose prose-invert max-w-none prose-p:mb-4 prose-headings:font-serif prose-headings:text-white prose-a:text-luxury-gold prose-a:no-underline hover:prose-a:underline"
                  dangerouslySetInnerHTML={{ __html: article.content }}
                />
              ) : (
                <div className="whitespace-pre-wrap font-sans text-[15px] sm:text-base">
                  {article.content}
                </div>
              )}
            </div>
          </motion.div>
        </div>
      </article>

      <PageFooter />
    </div>
  );
}
