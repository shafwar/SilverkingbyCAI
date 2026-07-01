"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { gsap } from "gsap";
import { QrCode, BookOpen } from "lucide-react";
import { useTranslations } from "next-intl";
import { usePathname } from "next/navigation";
import { OptimizedLink } from "@/components/ui/OptimizedLink";
import { PageHeroMedia } from "@/components/hero/PageHeroSection";
import { HOME_HERO_VIGNETTE_BG } from "@/lib/hero-media-defaults";

interface HeroSectionProps {
  shouldAnimate?: boolean;
  /** Home LCP: no GSAP hiding headline on first paint */
  priorityLcp?: boolean;
}

function HeroQrScanCardLink({ t }: { t: (key: string) => string }) {
  return (
    <OptimizedLink
      href="/authenticity"
      className="group inline-flex items-center gap-3 text-left w-full max-w-[min(calc(100vw-32px),360px)] sm:max-w-[368px] rounded-2xl border border-white/[0.12] bg-black/45 p-3.5 shadow-[0_12px_40px_rgba(0,0,0,0.35)] backdrop-blur-md transition-all duration-300 hover:border-white/20 hover:bg-black/55 pointer-events-auto"
    >
      <div className="flex h-9 w-9 sm:h-10 sm:w-10 flex-shrink-0 items-center justify-center rounded-xl border border-white/25 bg-black/50">
        <QrCode className="h-[1.15rem] w-[1.15rem] sm:h-5 sm:w-5 text-white" strokeWidth={2} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[0.5rem] sm:text-[0.5rem] font-medium uppercase tracking-[0.32em] text-luxury-gold">
          {t("qrCard.label")}
        </p>
        <p className="mt-1 text-[0.8125rem] sm:text-[0.875rem] md:text-[0.95rem] font-sans font-semibold text-white tracking-tight leading-snug">
          {t("qrCard.title")}
        </p>
        <p className="mt-1 text-[0.625rem] sm:text-[0.65rem] font-sans text-white/65 leading-relaxed line-clamp-3 sm:line-clamp-2">
          {t("qrCard.description")}
        </p>
      </div>
    </OptimizedLink>
  );
}

export default function HeroSection({
  shouldAnimate = true,
  priorityLcp = false,
}: HeroSectionProps) {
  const t = useTranslations("home.hero");
  const tJournal = useTranslations("home.journalTeaser");
  const pathname = usePathname();
  const containerRef = useRef<HTMLDivElement>(null);
  const headlineRef = useRef<HTMLHeadingElement>(null);
  const subtitleRef = useRef<HTMLParagraphElement>(null);
  const statsRef = useRef<HTMLDivElement>(null);

  /** Keep hero shell cheap on SPA route changes — previous GSAP+blur here cost hundreds of ms main-thread (bad INP). */
  useEffect(() => {
    if (containerRef.current) {
      gsap.set(containerRef.current, { opacity: 1, filter: "none", clearProps: "filter" });
    }
  }, [pathname]);

  // Features data from translations - simple and stable
  const featuresData = [
    {
      label: t("features.chainOfCustody.label"),
      title: t("features.chainOfCustody.title"),
      body: t("features.chainOfCustody.body"),
    },
    {
      label: t("features.purityLab.label"),
      title: t("features.purityLab.title"),
      body: t("features.purityLab.body"),
    },
    {
      label: t("features.globalTrust.label"),
      title: t("features.globalTrust.title"),
      body: t("features.globalTrust.body"),
    },
  ];

  const [animationsReady, setAnimationsReady] = useState(false);

  // Defer heavy animations until after initial page load
  useEffect(() => {
    // Wait for page to be interactive before starting heavy animations
    if (typeof window !== "undefined") {
      if (document.readyState === "complete") {
        // Use requestIdleCallback to defer animations
        if ("requestIdleCallback" in window) {
          requestIdleCallback(
            () => {
              setAnimationsReady(true);
            },
            { timeout: 1000 }
          );
        } else {
          setTimeout(() => setAnimationsReady(true), 500);
        }
      } else {
        window.addEventListener(
          "load",
          () => {
            if ("requestIdleCallback" in window) {
              requestIdleCallback(
                () => {
                  setAnimationsReady(true);
                },
                { timeout: 1000 }
              );
            } else {
              setTimeout(() => setAnimationsReady(true), 500);
            }
          },
          { once: true }
        );
      }
    }
  }, []);

  // First paint: keep hero copy visible for LCP; GSAP timeline uses fromTo for entrance when not priorityLcp.
  useLayoutEffect(() => {
    const setTextVisible = () => {
      if (headlineRef.current) {
        const words = headlineRef.current.querySelectorAll(".word");
        gsap.set(words, { opacity: 1, y: 0, rotationX: 0, scale: 1, filter: "blur(0px)" });
      }
      if (subtitleRef.current) {
        gsap.set(subtitleRef.current, {
          opacity: 1,
          y: 0,
          clipPath: "polygon(0 0, 100% 0, 100% 100%, 0 100%)",
          filter: "blur(0px)",
        });
      }
      if (statsRef.current) {
        gsap.set(statsRef.current, { opacity: 1, x: 0 });
        const statItems = statsRef.current.querySelectorAll(".stat-item");
        gsap.set(statItems, { opacity: 1, x: 0, y: 0, filter: "blur(0px)" });
      }
    };

    setTextVisible();
  }, [priorityLcp]);

  // ANIMATE WHEN shouldAnimate becomes true
  useEffect(() => {
    if (priorityLcp) return;
    if (!shouldAnimate) return;

    const ctx = gsap.context(() => {
      const masterTL = gsap.timeline({
        defaults: {
          ease: "power4.out",
        },
      });

      // Headline words animation - START ALMOST IMMEDIATELY
      if (headlineRef.current) {
        const words = headlineRef.current.querySelectorAll(".word");
        masterTL.fromTo(
          words,
          {
            opacity: 0,
            y: 100,
            rotationX: -25,
            scale: 0.8,
            filter: "blur(10px)",
          },
          {
            opacity: 1,
            y: 0,
            rotationX: 0,
            scale: 1,
            filter: "blur(0px)",
            duration: 1.6,
            stagger: { amount: 1.0, from: "start", ease: "power3.inOut" },
            ease: "expo.out",
            transformOrigin: "center bottom",
          },
          0.1
        );
      }

      // Subtitle - FASTER
      masterTL.fromTo(
        subtitleRef.current,
        {
          opacity: 0,
          y: 50,
          clipPath: "polygon(0 0, 100% 0, 100% 0, 0 0)",
          filter: "blur(8px)",
        },
        {
          opacity: 1,
          y: 0,
          clipPath: "polygon(0 0, 100% 0, 100% 100%, 0 100%)",
          filter: "blur(0px)",
          duration: 1.4,
          ease: "expo.out",
        },
        1.0
      );

      // Insight container entrance
      masterTL.fromTo(
        statsRef.current,
        { opacity: 0, x: 40 },
        {
          opacity: 1,
          x: 0,
          duration: 1.4,
          ease: "power3.out",
        },
        0.5
      );

      // Insight rows cascade
      const statItems = statsRef.current?.querySelectorAll(".stat-item");
      if (statItems) {
        masterTL.fromTo(
          statItems,
          {
            opacity: 0,
            x: 20,
            y: 10,
            filter: "blur(4px)",
          },
          {
            opacity: 1,
            x: 0,
            y: 0,
            filter: "blur(0px)",
            duration: 1,
            stagger: {
              amount: 0.4,
              ease: "power2.out",
              from: "start",
            },
            ease: "power3.out",
          },
          1.0
        );
      }
    });

    return () => ctx.revert();
  }, [shouldAnimate, animationsReady, priorityLcp]);

  return (
    <section
      ref={containerRef}
      className="relative isolate h-screen w-full overflow-hidden hero-section-transition bg-transparent"
      style={{
        pointerEvents: "auto",
      }}
    >
      <PageHeroMedia
        page="home"
        overlay={
          <div
            className="pointer-events-none absolute inset-0 z-[1]"
            style={{ backgroundImage: HOME_HERO_VIGNETTE_BG }}
            aria-hidden
          />
        }
      />
      <div
        className="absolute bottom-0 left-0 right-0 z-[1] h-[3px] bg-luxury-black pointer-events-none"
        aria-hidden
      />

      {/* Content - UNIVERSAL untuk SEMUA device mobile */}
      <div className="relative z-10 flex h-full items-center pt-[calc(env(safe-area-inset-top)+0.75rem)] sm:pt-8 md:pt-0 pb-[calc(env(safe-area-inset-bottom)+1rem)] sm:pb-16 md:pb-0 pointer-events-none">
        <div className="mx-auto w-full max-w-[1600px] px-4 sm:px-6 md:px-10 lg:px-14 xl:px-20 pointer-events-none">
          {/* Main content - Optimized untuk semua mobile */}
          <div className="max-w-[900px] -translate-y-2 sm:-translate-y-3 md:translate-y-0 pointer-events-auto">
            {/* Headline - Universal responsive */}
            <h1
              ref={headlineRef}
              className="mb-2 sm:mb-3 md:mb-5 font-sans text-[1.7rem] sm:text-[2.25rem] md:text-[3rem] lg:text-[3.5rem] xl:text-[4rem] 2xl:text-[4.5rem] font-semibold tracking-tight md:tracking-[-0.03em] leading-[1.2] sm:leading-[1.2] md:leading-[1.25] text-white"
              style={{ perspective: "1000px" }}
            >
              {/* Fragment 1 */}
              <span
                className="word inline-block bg-[radial-gradient(circle_at_top,_#fff7c0,_#FFD700,_#AC7A00)] bg-clip-text text-transparent"
                style={{ transformStyle: "preserve-3d" }}
              >
                {t("headline1")}
              </span>{" "}
              <span
                className="word inline-block bg-[radial-gradient(circle_at_bottom,_#fff7c0,_#FFD700,_#AC7A00)] bg-clip-text text-transparent"
                style={{ transformStyle: "preserve-3d" }}
              >
                {t("headline2")}
              </span>{" "}
              {/* Fragment 2 */}
              <span
                id="hero-home-timeless-anchor"
                className="word inline-block"
                style={{ transformStyle: "preserve-3d" }}
              >
                {t("headline3")}
              </span>{" "}
              <span
                className="word inline-block bg-gradient-to-r from-white via-[#E8E8E8] to-white bg-clip-text text-transparent"
                style={{ transformStyle: "preserve-3d" }}
              >
                {t("headline4")}
              </span>{" "}
              {/* Fragment 3 */}
              <span className="word inline-block" style={{ transformStyle: "preserve-3d" }}>
                {t("headline5")}
              </span>{" "}
              <span
                className="word inline-block bg-gradient-to-r from-[#C0C0C0] via-[#E8E8E8] to-[#C0C0C0] bg-clip-text text-transparent"
                style={{ transformStyle: "preserve-3d" }}
              >
                {t("headline6")}
              </span>
            </h1>

            {/* Subtitle - Universal responsive */}
            <p
              ref={subtitleRef}
              className="max-w-[92%] sm:max-w-[88%] md:max-w-[85%] font-sans text-[0.875rem] sm:text-[0.9375rem] md:text-[1rem] lg:text-[1.0625rem] leading-[1.65] sm:leading-[1.65] md:leading-[1.7] font-light text-white/75 mt-3.5 sm:mt-5 md:mt-0"
            >
              {t.rich("subtitle", {
                gold: (chunks) => <span className="font-medium text-white/90">{chunks}</span>,
                custom: (chunks) => <span className="font-medium text-white/90">{chunks}</span>,
                qr: (chunks) => <span className="font-medium text-white/90">{chunks}</span>,
              })}
            </p>

            {/* Journal teaser — desktop only: left below subtitle; mobile: moved to between features & Scan & Verify */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={shouldAnimate ? { opacity: 1, y: 0 } : { opacity: 0, y: 8 }}
              transition={{ duration: 0.6, delay: 1, ease: "easeOut" }}
              className="mt-4 sm:mt-5 md:mt-6 hidden md:block"
            >
              <OptimizedLink
                href="/journal"
                className="group inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-2.5 backdrop-blur-sm transition-all duration-300 hover:bg-white/10 hover:border-amber-500/30 hover:shadow-[0_0_20px_rgba(245,158,11,0.06)]"
                aria-label={tJournal("title")}
              >
                <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full border border-amber-500/25 bg-amber-500/10 text-amber-400/90 transition-colors group-hover:border-amber-500/35 group-hover:bg-amber-500/15">
                  <BookOpen className="h-4 w-4" />
                </span>
                <span className="font-sans text-[0.875rem] font-medium text-white/90 tracking-tight">
                  {tJournal("title")}
                </span>
                <span className="font-sans text-[0.75rem] text-white/55 max-w-[180px] truncate">
                  — {tJournal("description")}
                </span>
              </OptimizedLink>
            </motion.div>
          </div>

          {/* Desktop: Insight stack */}
          <div className="hidden md:flex absolute right-3 lg:right-8 xl:right-12 top-1/2 -translate-y-1/2 pointer-events-auto z-20">
            <div ref={statsRef} className="flex flex-col gap-5 text-right items-end max-w-[360px]">
              {featuresData.map((item, index) => (
                <div key={item.label} className="stat-item relative pl-6">
                  <div className="absolute left-0 top-0 bottom-0 w-[1.5px] bg-gradient-to-b from-transparent via-white/25 to-transparent">
                    <div className="absolute -left-[2.5px] top-1.5 h-1.5 w-1.5 rounded-full bg-gradient-to-r from-white/60 to-white/20" />
                  </div>
                  <p className="font-sans text-[0.52rem] uppercase tracking-[0.45em] text-white/45">
                    {item.label}
                  </p>
                  <p className="mt-1 font-sans text-[1.05rem] font-semibold bg-gradient-to-r from-white via-white/80 to-white/60 bg-clip-text text-transparent tracking-tight leading-snug">
                    {item.title}
                  </p>
                  <p className="mt-1 font-sans text-[0.75rem] text-white/55 leading-relaxed">
                    {item.body}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Mobile: circular Journal + Scan & Verify (fixed bottom stack, proportional spacing) */}
      <div
        className="md:hidden absolute left-0 right-0 z-30 flex flex-col items-center gap-5 px-5 pointer-events-none"
        style={{ bottom: "calc(52px + env(safe-area-inset-bottom, 0px))" }}
      >
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={shouldAnimate ? { opacity: 1, y: 0 } : { opacity: 0, y: 10 }}
          transition={{ duration: 0.55, delay: 0.95, ease: "easeOut" }}
          className="pointer-events-auto"
        >
          <OptimizedLink
            href="/journal"
            aria-label={tJournal("title")}
            className="flex h-[3.5rem] w-[3.5rem] items-center justify-center rounded-full border-2 border-luxury-gold bg-black/35 text-white shadow-[0_0_28px_rgba(212,175,55,0.4),inset_0_1px_0_rgba(255,255,255,0.12)] backdrop-blur-md transition-transform active:scale-[0.96] hover:border-luxury-lightGold hover:shadow-[0_0_32px_rgba(255,215,0,0.45)]"
          >
            <BookOpen className="h-[1.4rem] w-[1.4rem]" strokeWidth={2.25} />
          </OptimizedLink>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={shouldAnimate ? { opacity: 1, y: 0 } : { opacity: 0, y: 14 }}
          transition={{ duration: 0.6, delay: 1.05, ease: "easeOut" }}
          className="pointer-events-auto flex w-full justify-center"
        >
          <HeroQrScanCardLink t={t} />
        </motion.div>
      </div>

      {/* Desktop: QR card */}
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.97 }}
        animate={{
          opacity: shouldAnimate ? 1 : 0,
          y: shouldAnimate ? 0 : 20,
          scale: shouldAnimate ? 1 : 0.97,
        }}
        transition={{ duration: 1, delay: 1.1, ease: "easeOut" }}
        className="hidden md:flex absolute bottom-8 inset-x-0 z-30 justify-center px-4 pointer-events-auto"
      >
        <HeroQrScanCardLink t={t} />
      </motion.div>

      {/* Bottom fade - dark vignette (Home only); translateZ + solid cap to prevent flickering line */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 2, delay: 1 }}
        className="absolute bottom-0 left-0 right-0 h-20 sm:h-24 md:h-36 pointer-events-none"
        style={{ transform: "translateZ(0)", WebkitBackfaceVisibility: "hidden" }}
      >
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-black" aria-hidden />
      </motion.div>
    </section>
  );
}
