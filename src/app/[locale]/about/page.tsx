"use client";

import Navbar from "@/components/layout/Navbar";
import {
  AnimatePresence,
  motion,
  useInView,
  type TargetAndTransition,
  type Variants,
} from "framer-motion";
import Link from "next/link";
import { useTranslations, useLocale } from "next-intl";
import { getR2UrlClient } from "@/utils/r2-url";
import {
  Shield,
  Award,
  Target,
  Sparkles,
  Eye,
  QrCode,
  ArrowRight,
  Instagram,
  Linkedin,
  Youtube,
  Github,
  Twitter,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useEffect, useMemo, useRef, type CSSProperties } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(ScrollTrigger);

const revealVariants: Variants = {
  initial: { opacity: 0, y: 40 },
  animate: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: "easeOut", staggerChildren: 0.15 },
  },
  exit: { opacity: 0, y: -40, transition: { duration: 0.4, ease: "easeIn" } },
};

const presenceVariants: Variants = {
  initial: { opacity: 0, y: 32, scale: 0.96, filter: "blur(8px)" },
  animate: (index = 0) => ({
    opacity: 1,
    y: 0,
    scale: 1,
    filter: "blur(0px)",
    transition: {
      duration: 0.6,
      ease: [0.22, 1, 0.36, 1],
      delay: Number(index) * 0.08,
    },
  }),
  exit: () => ({
    opacity: 0,
    y: -32,
    scale: 0.95,
    filter: "blur(10px)",
    transition: { duration: 0.4, ease: [0.64, 0, 0.78, 0] },
  }),
};

const glassPanelVariants: Variants = {
  initial: { opacity: 0, scale: 0.94, y: 28, filter: "blur(10px)" },
  animate: (index = 0) => ({
    opacity: 1,
    scale: 1,
    y: 0,
    filter: "blur(0px)",
    transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1], delay: Number(index) * 0.08 },
  }),
  exit: () => ({
    opacity: 0,
    scale: 0.92,
    y: -24,
    filter: "blur(12px)",
    transition: { duration: 0.45, ease: [0.55, 0, 0.7, 0] },
  }),
};

const hoverSpring = {
  scale: 1.02,
  transition: {
    type: "spring",
    stiffness: 220,
    damping: 18,
  },
} satisfies TargetAndTransition;

type FeatureItem = {
  icon: LucideIcon;
  title: string;
  description: string;
  gradient: string;
};

type StepItem = {
  number: string;
  icon: LucideIcon;
  title: string;
  description: string;
};

type ValueItem = {
  icon: LucideIcon;
  title: string;
  description: string;
};

const FeatureCard = ({ feature, index }: { feature: FeatureItem; index: number }) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const isInView = useInView(containerRef, { amount: 0.45, margin: "-15% 0px" });

  return (
    <div ref={containerRef} className="group relative min-h-[360px]">
      <AnimatePresence mode="sync">
        {isInView && (
          <motion.div
            key={`${feature.title}-card`}
            variants={glassPanelVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            custom={index}
            whileHover={hoverSpring}
            className="relative flex h-full flex-col rounded-3xl border border-white/10 bg-gradient-to-br from-white/5 to-white/[0.02] p-10 backdrop-blur-xl transition-all duration-500 hover:border-luxury-gold/40 hover:shadow-[0px_30px_80px_-40px_rgba(212,175,55,0.6)]"
          >
            <div
              className="absolute -inset-px rounded-3xl bg-gradient-to-br opacity-0 blur-2xl transition-opacity duration-500 group-hover:opacity-20"
              style={{ background: `linear-gradient(to bottom right, var(--tw-gradient-stops))` }}
            />

            <div className="relative z-10">
              <div
                className={`mb-6 inline-flex rounded-2xl bg-gradient-to-br ${feature.gradient} p-4 shadow-lg`}
              >
                <feature.icon className="h-6 w-6 text-white" />
              </div>
              <h3 className="mb-3 text-2xl font-semibold text-white">{feature.title}</h3>
              <p className="text-luxury-silver/80 leading-relaxed">{feature.description}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const StepCard = ({ step, index }: { step: StepItem; index: number }) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const isInView = useInView(containerRef, { amount: 0.45, margin: "-25% 0px" });

  return (
    <div ref={containerRef} className="relative min-h-[340px]">
      <AnimatePresence mode="sync">
        {isInView && (
          <motion.div
            key={`${step.number}-step`}
            variants={presenceVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            custom={index}
            className="relative flex h-full flex-col items-center text-center"
          >
            {index < 2 && (
              <motion.div
                className="absolute left-full top-12 hidden h-0.5 w-12 bg-gradient-to-r from-luxury-gold/50 to-transparent md:block"
                initial={{ opacity: 0, scaleX: 0 }}
                animate={{
                  opacity: 1,
                  scaleX: 1,
                  originX: 0,
                  transition: { duration: 0.5, ease: "easeOut", delay: 0.2 },
                }}
                exit={{ opacity: 0, scaleX: 0, transition: { duration: 0.3, ease: "easeIn" } }}
              />
            )}

            <div className="mx-auto mb-6 inline-flex h-24 w-24 items-center justify-center rounded-full border border-luxury-gold/40 bg-gradient-to-br from-luxury-gold/15 to-luxury-silver/10 shadow-[0_20px_40px_-30px_rgba(212,175,55,0.6)]">
              <span className="bg-gradient-to-br from-luxury-gold to-luxury-lightGold bg-clip-text text-3xl font-bold text-transparent">
                {step.number}
              </span>
            </div>

            <div className="mb-4 flex justify-center">
              <step.icon className="h-12 w-12 text-luxury-gold drop-shadow-[0_10px_30px_rgba(212,175,55,0.24)]" />
            </div>

            <h3 className="mb-3 text-xl font-semibold text-white">{step.title}</h3>
            <p className="text-luxury-silver/70 leading-relaxed">{step.description}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const ValueCard = ({ value, index }: { value: ValueItem; index: number }) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const isInView = useInView(containerRef, { amount: 0.5, margin: "-25% 0px" });

  return (
    <div ref={containerRef} className="min-h-[220px]">
      <AnimatePresence mode="sync">
        {isInView && (
          <motion.div
            key={`${value.title}-value`}
            variants={presenceVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            custom={index}
            whileHover={hoverSpring}
            className="rounded-2xl border border-white/10 bg-gradient-to-br from-white/10 via-white/[0.03] to-transparent p-8 text-center backdrop-blur-xl shadow-[0_20px_70px_-30px_rgba(0,0,0,0.7)]"
          >
            <value.icon className="mx-auto mb-4 h-10 w-10 text-luxury-gold" />
            <h3 className="mb-2 text-lg font-semibold text-luxury-gold">{value.title}</h3>
            <p className="text-sm text-luxury-silver/70">{value.description}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default function AboutPage() {
  const t = useTranslations('about');
  const tNav = useTranslations('nav');
  const locale = useLocale();
  const pageRef = useRef<HTMLDivElement | null>(null);
  const heroRef = useRef<HTMLDivElement | null>(null);
  const noiseOverlay = useRef<HTMLDivElement | null>(null);
  const gradientOverlay = useRef<HTMLDivElement | null>(null);
  const sectionsRef = useRef<(HTMLElement | null)[]>([]);
  const parallaxRef = useRef<(HTMLDivElement | null)[]>([]);
  const magneticButtonsRef = useRef<(HTMLAnchorElement | null)[]>([]);

  const featureItems = useMemo<FeatureItem[]>(
    () => [
      {
        icon: Shield,
        title: t('whyChoose.features.authenticity.title'),
        description: t('whyChoose.features.authenticity.description'),
        gradient: "from-emerald-500 to-teal-600",
      },
      {
        icon: Sparkles,
        title: t('whyChoose.features.quality.title'),
        description: t('whyChoose.features.quality.description'),
        gradient: "from-luxury-gold to-luxury-lightGold",
      },
      {
        icon: Award,
        title: t('whyChoose.features.craftsmanship.title'),
        description: t('whyChoose.features.craftsmanship.description'),
        gradient: "from-luxury-silver to-white",
      },
    ],
    [t]
  );

  const stepItems = useMemo<StepItem[]>(
    () => [
      {
        number: t('howItWorks.steps.step1.number'),
        icon: QrCode,
        title: t('howItWorks.steps.step1.title'),
        description: t('howItWorks.steps.step1.description'),
      },
      {
        number: t('howItWorks.steps.step2.number'),
        icon: Eye,
        title: t('howItWorks.steps.step2.title'),
        description: t('howItWorks.steps.step2.description'),
      },
      {
        number: t('howItWorks.steps.step3.number'),
        icon: Shield,
        title: t('howItWorks.steps.step3.title'),
        description: t('howItWorks.steps.step3.description'),
      },
    ],
    [t]
  );

  const valueItems = useMemo<ValueItem[]>(
    () => [
      {
        icon: Shield,
        title: t('story.values.authenticity.title'),
        description: t('story.values.authenticity.description'),
      },
      {
        icon: Award,
        title: t('story.values.excellence.title'),
        description: t('story.values.excellence.description'),
      },
      {
        icon: Target,
        title: t('story.values.precision.title'),
        description: t('story.values.precision.description'),
      },
    ],
    [t]
  );

  const premiumGradient = useMemo(
    () =>
      "linear-gradient(160deg, rgba(18,18,18,0.94) 0%, rgba(10,10,10,0.98) 55%, rgba(6,6,6,1) 100%)",
    []
  );

  useGSAP(
    () => {
      if (!pageRef.current) return;

      const ctx = gsap.context(() => {
        gsap.set("[data-reveal]", { autoAlpha: 0, y: 40 });

        sectionsRef.current.forEach((section) => {
          if (!section) return;
          const targets = section.querySelectorAll("[data-reveal]");

          ScrollTrigger.batch(targets, {
            start: "top 80%",
            onEnter: (batch) =>
              gsap.to(batch, {
                autoAlpha: 1,
                y: 0,
                duration: 0.6,
                stagger: 0.12,
                ease: "power3.out",
              }),
            once: true,
          });
        });

        parallaxRef.current.forEach((element) => {
          if (!element) return;
          const depth = Number(element.dataset.speed || 0.2);
          gsap.to(element, {
            yPercent: depth * -20,
            ease: "none",
            scrollTrigger: {
              trigger: element,
              start: "top bottom",
              scrub: true,
            },
          });
        });

        if (heroRef.current) {
          const heroTimeline = gsap.timeline({ defaults: { ease: "power3.out" } });
          heroTimeline
            .fromTo(
              heroRef.current.querySelectorAll("[data-hero]") || [],
              { autoAlpha: 0, y: 40 },
              { autoAlpha: 1, y: 0, duration: 0.8, stagger: 0.15 }
            )
            .fromTo(
              heroRef.current.querySelectorAll("[data-hero-glow]") || [],
              { scale: 0.9, autoAlpha: 0 },
              { scale: 1, autoAlpha: 1, duration: 0.8, ease: "power2.out" },
              "<"
            );
        }

        magneticButtonsRef.current.forEach((button) => {
          if (!button) return;
          const xTo = gsap.quickTo(button, "x", { duration: 0.5, ease: "power3" });
          const yTo = gsap.quickTo(button, "y", { duration: 0.5, ease: "power3" });

          const handlePointerMove = (event: MouseEvent) => {
            const rect = button.getBoundingClientRect();
            const centerX = rect.left + rect.width / 2;
            const centerY = rect.top + rect.height / 2;
            const deltaX = (event.clientX - centerX) * 0.2;
            const deltaY = (event.clientY - centerY) * 0.2;
            xTo(deltaX);
            yTo(deltaY);
          };

          const reset = () => {
            xTo(0);
            yTo(0);
          };

          button.addEventListener("pointermove", handlePointerMove);
          button.addEventListener("pointerleave", reset);

          ScrollTrigger.create({
            trigger: button,
            start: "top bottom",
            once: true,
            onLeave: reset,
          });
        });
      }, pageRef);

      return () => ctx.revert();
    },
    { scope: pageRef }
  );

  useEffect(() => {
    if (!noiseOverlay.current) return;

    noiseOverlay.current.style.backgroundImage =
      'url(\'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" preserveAspectRatio="none"><filter id="n"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="3"/></filter><rect width="100%" height="100%" filter="url(%23n)" opacity="0.15"/></svg>\')';
  }, []);

  return (
    <div
      ref={pageRef}
      className="min-h-screen bg-luxury-black text-white selection:bg-luxury-gold/20 selection:text-white"
      style={{ backgroundImage: premiumGradient }}
    >
      <div
        ref={noiseOverlay}
        className="pointer-events-none fixed inset-0 z-0 opacity-60 mix-blend-soft-light"
      />
      <div
        ref={gradientOverlay}
        className="pointer-events-none fixed inset-0 z-0 opacity-90"
        style={{
          background:
            "linear-gradient(180deg, rgba(18,18,18,0.7) 0%, rgba(10,10,10,0.85) 45%, rgba(4,4,4,0.95) 100%)",
        }}
      />
      {/* Navbar */}
      <Navbar />

      {/* Hero Section */}
      <section
        ref={(element) => {
          sectionsRef.current[0] = element;
        }}
        className="relative flex min-h-[100vh] items-center px-6 pb-24 pt-24 md:pt-32"
      >
        {/* Fullscreen Video Background */}
        <div className="absolute inset-0 z-0 overflow-hidden">
          <video
            ref={(video) => {
              if (video) {
                // Optimal video autoplay handling - ensure video never pauses or breaks
                const forcePlay = async () => {
                  try {
                    if (video.paused && !video.ended) {
                      await video.play();
                    }
                  } catch (error) {
                    console.warn("[AboutPage] Video autoplay prevented, retrying:", error);
                    // Retry after a short delay with exponential backoff
                    setTimeout(() => {
                      video.play().catch(() => {
                        // Second retry after longer delay
                        setTimeout(() => {
                          video.play().catch(() => {
                            console.warn("[AboutPage] Video autoplay failed after multiple retries");
                          });
                        }, 500);
                      });
                    }, 100);
                  }
                };

                // Handle video ready states
                const handleCanPlay = () => {
                  forcePlay();
                };

                const handleLoadedData = () => {
                  forcePlay();
                };

                // Handle video errors
                const handleError = () => {
                  console.warn("[AboutPage] Video error occurred");
                };

                // Resume video if it pauses (prevent breaks)
                const handlePause = () => {
                  if (!video.ended) {
                    // Small delay to avoid infinite loop
                    setTimeout(() => {
                      if (video.paused && !video.ended) {
                        forcePlay();
                      }
                    }, 50);
                  }
                };

                // Handle visibility change - resume video when page becomes visible
                const handleVisibilityChange = () => {
                  if (!document.hidden && video.paused && !video.ended) {
                    forcePlay();
                  }
                };

                // Handle video end - restart immediately for seamless loop
                const handleEnded = () => {
                  video.currentTime = 0;
                  forcePlay();
                };

                // Handle video waiting/buffering - resume when ready
                const handleWaiting = () => {
                  // Video is buffering, will resume automatically when ready
                  // But we can also try to play if it's paused
                  if (video.paused && !video.ended) {
                    setTimeout(() => {
                      forcePlay();
                    }, 100);
                  }
                };

                // Initial play attempt
                forcePlay();

                // Event listeners
                video.addEventListener("canplay", handleCanPlay);
                video.addEventListener("loadeddata", handleLoadedData);
                video.addEventListener("error", handleError);
                video.addEventListener("pause", handlePause);
                video.addEventListener("ended", handleEnded);
                video.addEventListener("waiting", handleWaiting);
                document.addEventListener("visibilitychange", handleVisibilityChange);

                // Force load video to ensure it starts loading immediately
                video.load();

                // Periodic check to ensure video is playing (fallback mechanism)
                const playCheckInterval = setInterval(() => {
                  if (video.paused && !video.ended && !document.hidden) {
                    forcePlay();
                  }
                }, 2000); // Check every 2 seconds

                // Cleanup stored on video element
                (video as any).__cleanup = () => {
                  video.removeEventListener("canplay", handleCanPlay);
                  video.removeEventListener("loadeddata", handleLoadedData);
                  video.removeEventListener("error", handleError);
                  video.removeEventListener("pause", handlePause);
                  video.removeEventListener("ended", handleEnded);
                  video.removeEventListener("waiting", handleWaiting);
                  document.removeEventListener("visibilitychange", handleVisibilityChange);
                  clearInterval(playCheckInterval);
                };
              }
            }}
            className="absolute inset-0 h-full w-full object-cover brightness-[0.85] scale-105"
            src={getR2UrlClient("/videos/hero/gold-footage.mp4")}
            autoPlay
            loop
            muted
            playsInline
            preload="auto"
            disablePictureInPicture
            disableRemotePlayback
          />
          {/* Smooth Multi-layer Gradients */}
          <div className="absolute inset-0 bg-gradient-to-b from-luxury-black/40 via-luxury-black/60 to-luxury-black" />
          <div className="absolute inset-0 bg-gradient-to-t from-luxury-black via-luxury-black/80 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-r from-luxury-black/50 via-transparent to-luxury-black/30" />
          <div className="absolute inset-x-0 bottom-0 h-64 bg-gradient-to-t from-luxury-black via-luxury-black/95 to-transparent" />
          {/* Subtle vignette effect */}
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,rgba(10,10,10,0.4)_100%)]" />
        </div>

        {/* Subtle light overlay */}
        <div className="absolute inset-0 z-0 bg-gradient-to-b from-white/5 via-transparent to-transparent" />

        <div
          className="relative z-10 mx-auto flex w-full max-w-[1200px] flex-col items-center text-center"
          ref={heroRef}
        >
          <motion.div
            variants={revealVariants}
            initial="initial"
            animate="animate"
            className="space-y-10 md:max-w-[680px]"
          >
            <motion.div
              className="inline-flex items-center justify-center gap-3 rounded-full border border-white/10 bg-white/5 px-6 py-2 text-[12px] uppercase tracking-[0.45em] text-luxury-silver/60 backdrop-blur"
              data-hero
            >
              <span className="h-1 w-1 rounded-full bg-luxury-gold" data-hero-glow />
              {t('hero.badge')}
              <span className="h-1 w-1 rounded-full bg-luxury-gold" data-hero-glow />
            </motion.div>
            <motion.h1
              className="text-[40px] font-sans font-semibold leading-tight tracking-[0.01em] text-white md:text-[68px] lg:text-[88px]"
              data-hero
            >
              <span className="block text-base uppercase ml-5 tracking-[0.75em] text-luxury-silver/70 md:text-3xl font-sans">
                {t('hero.title')}
              </span>
            </motion.h1>
            <motion.p
              className="mx-auto max-w-3xl text-sm font-sans font-light leading-relaxed text-luxury-silver/70 md:text-base"
              data-hero
            >
              {t('hero.subtitle')}
            </motion.p>
          </motion.div>

          <div
            ref={(element) => {
              parallaxRef.current[0] = element;
            }}
            data-speed="0.3"
            className="pointer-events-none absolute left-1/2 top-full z-0 h-45 w-[70%] -translate-x-1/2 -translate-y-20 rounded-full bg-gradient-to-r from-white/10 via-transparent to-transparent blur-xl"
          />
        </div>
      </section>

      {/* Why Choose Us Section */}
      <section
        ref={(element) => {
          sectionsRef.current[1] = element;
        }}
        className="relative overflow-hidden py-28 md:py-36 px-6"
      >
        <div className="absolute inset-0 z-0 bg-gradient-to-b from-[#171717] via-[#0f0f0f] to-[#060606]" />
        <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-luxury-black via-transparent to-transparent" />
        <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-luxury-black via-transparent to-transparent" />

        <div className="relative z-10 mx-auto max-w-[1320px]">
          <motion.div className="mb-20 text-center" data-reveal>
            <h2 className="mb-5 text-4xl md:text-5xl lg:text-6xl font-light tracking-tight">
              <span className="text-white">{t('whyChoose.title')}</span>{" "}
              <span className="bg-gradient-to-r from-luxury-gold to-luxury-lightGold bg-clip-text text-transparent">
                {t('whyChoose.titleBold')}
              </span>
            </h2>
            <p className="mx-auto max-w-3xl text-lg md:text-xl text-luxury-silver/70">
              {t('whyChoose.subtitle')}
            </p>
          </motion.div>

          <div className="grid grid-cols-1 gap-10 md:grid-cols-3 md:gap-12">
            {featureItems.map((feature, index) => (
              <FeatureCard key={feature.title} feature={feature} index={index} />
            ))}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section
        ref={(element) => {
          sectionsRef.current[2] = element;
        }}
        className="relative py-28 md:py-36 px-6"
      >
        <div className="absolute inset-0 bg-gradient-to-b from-[#151515] via-[#0e0e0e] to-[#050505]" />
        <div className="absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-luxury-black via-transparent to-transparent" />
        <div className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-luxury-black via-transparent to-transparent" />

        <div className="relative mx-auto max-w-[1320px]">
          <div className="mb-20 text-center space-y-5" data-reveal>
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-light tracking-tight">
              <span className="text-white">{t('howItWorks.title')}</span>{" "}
              <span className="bg-gradient-to-r from-luxury-gold to-luxury-silver bg-clip-text text-transparent">
                {t('howItWorks.titleBold')}
              </span>
            </h2>
            <p className="mx-auto max-w-3xl text-lg md:text-xl text-luxury-silver/70">
              {t('howItWorks.subtitle')}
            </p>
          </div>

          <div className="grid grid-cols-1 gap-12 md:grid-cols-3 md:gap-10">
            {stepItems.map((step, index) => (
              <StepCard key={step.number} step={step} index={index} />
            ))}
          </div>
        </div>
      </section>

      {/* Story Section */}
      <section
        ref={(element) => {
          sectionsRef.current[3] = element;
        }}
        className="relative py-28 md:py-36 px-6"
      >
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-[#141414] via-[#0c0c0c] to-[#050505]" />
          <div className="absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-luxury-black via-transparent to-transparent" />
          <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-luxury-black via-transparent to-transparent" />
        </div>

        <div className="relative mx-auto grid max-w-[1320px] grid-cols-1 items-center gap-16 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-8" data-reveal>
            <h2 className="text-4xl md:text-5xl font-light tracking-tight text-luxury-gold">
              {t('story.title')}
            </h2>
            <div className="space-y-5 text-base leading-relaxed text-luxury-silver/80">
              <p>
                {t('story.paragraph1')}
              </p>
              <p>
                {t('story.paragraph2')}
              </p>
              <p>
                {t('story.paragraph3')}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            {valueItems.map((value, index) => (
              <ValueCard key={value.title} value={value} index={index} />
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section
        ref={(element) => {
          sectionsRef.current[4] = element;
        }}
        className="relative py-32 md:py-40 px-6"
      >
        <div className="mx-auto max-w-[1320px]">
          <motion.div
            className="group relative overflow-hidden rounded-[44px] border border-white/8 bg-[#090909] p-[1.5px] shadow-[0_70px_140px_-60px_rgba(0,0,0,0.85)]"
            variants={glassPanelVariants}
            initial="initial"
            whileInView="animate"
            viewport={{ once: true, amount: 0.6 }}
            data-reveal
          >
            <div
              className="absolute inset-0 rounded-[44px] opacity-80 transition-opacity duration-700 group-hover:opacity-100"
              style={{
                background:
                  "linear-gradient(135deg, rgba(212,175,55,0.22) 0%, rgba(212,175,55,0.05) 38%, rgba(192,192,192,0.08) 62%, transparent 100%)",
              }}
            />
            <div className="absolute inset-[1.5px] rounded-[42px] bg-gradient-to-b from-[#161616] via-[#0f0f0f] to-[#050505] backdrop-blur-[18px]" />
            <div className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-white/10 via-transparent to-transparent opacity-50" />
            <div className="pointer-events-none absolute inset-x-16 bottom-0 h-56 bg-[radial-gradient(ellipse_at_center,rgba(212,175,55,0.18)0%,transparent70%)] opacity-40" />
            <div className="pointer-events-none absolute inset-0 opacity-[0.05]">
              <div
                className="absolute inset-0"
                style={{
                  backgroundImage: `radial-gradient(circle at 1px 1px, rgba(255,255,255,0.12) 1px, transparent 0)`,
                  backgroundSize: "46px 46px",
                }}
              />
            </div>

            <div className="relative z-10 px-10 py-14 text-center md:px-16 md:py-16 lg:px-24 lg:py-20">
              <h2 className="mb-6 text-4xl md:text-5xl lg:text-6xl font-light tracking-tight">
                <span className="text-white">{t('cta.title')}</span>
                <br />
                <span className="bg-gradient-to-r from-luxury-gold via-luxury-lightGold to-luxury-silver bg-clip-text text-transparent">
                  {t('cta.titleBold')}
                </span>
              </h2>
              <p className="mx-auto mb-12 max-w-2xl text-lg md:text-xl text-luxury-silver/75">
                {t('cta.subtitle')}
              </p>

              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-center">
                <Link
                  href="/verify"
                  ref={(element) => {
                    magneticButtonsRef.current[0] = element;
                  }}
                  className="group relative inline-flex items-center justify-center gap-3 overflow-hidden rounded-full bg-gradient-to-r from-luxury-gold to-luxury-lightGold px-9 py-4 text-base font-semibold text-black transition-all duration-300 hover:shadow-[0_35px_90px_-35px_rgba(212,175,55,0.8)]"
                >
                  <Shield className="h-5 w-5" />
                  <span>{t('cta.startVerification')}</span>
                  <ArrowRight className="h-5 w-5 transition-transform duration-300 group-hover:translate-x-1" />
                  <motion.span
                    className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/30 to-white/0 opacity-0"
                    initial={{ opacity: 0 }}
                    whileHover={{ opacity: 0.25 }}
                    transition={{ duration: 0.4, ease: "easeOut" }}
                  />
                </Link>

                <Link
                  href="/"
                  ref={(element) => {
                    magneticButtonsRef.current[1] = element;
                  }}
                  className="inline-flex items-center justify-center gap-3 rounded-full border border-white/20 bg-white/[0.04] px-8 py-4 text-base font-semibold text-white backdrop-blur-sm transition-all duration-300 hover:border-white/40 hover:bg-white/10"
                >
                  {t('cta.backToHome')}
                </Link>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer Section – Consistent with What We Do page */}
      <section
        ref={(element) => {
          sectionsRef.current[5] = element;
        }}
        className="relative px-6 md:px-8 lg:px-12 py-16 md:py-20 lg:py-24"
      >
        {/* Footer Navigation & Social */}
        <div className="relative z-10 mx-auto w-full max-w-[1320px] flex flex-col md:flex-row items-start md:items-end justify-between gap-8 md:gap-0">
          {/* Left: Navigation Links */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="flex flex-wrap items-center gap-6 md:gap-8"
          >
            <span className="text-white/40 text-sm">×</span>
            <Link
              href={`/${locale}/what-we-do`}
              className="text-sm md:text-base font-medium text-white/80 hover:text-white transition-colors duration-300"
            >
              {tNav('whatWeDo')}
            </Link>
            <Link
              href={`/${locale}/authenticity`}
              className="text-sm md:text-base font-medium text-white/80 hover:text-white transition-colors duration-300"
            >
              {tNav('authenticity')}
            </Link>
            <Link
              href={`/${locale}/products`}
              className="text-sm md:text-base font-medium text-white/80 hover:text-white transition-colors duration-300"
            >
              {tNav('products')}
            </Link>
            <Link
              href={`/${locale}/about`}
              className="text-sm md:text-base font-medium text-white/80 hover:text-white transition-colors duration-300"
            >
              {tNav('aboutUs')}
            </Link>
          </motion.div>

          {/* Right: Social Media Icons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="flex items-center gap-4 md:gap-5"
          >
            <a
              href="https://github.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-white/80 hover:text-white transition-colors duration-300"
              aria-label="GitHub"
            >
              <Github className="h-5 w-5 md:h-6 md:w-6" />
            </a>
            <a
              href="https://instagram.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-white/80 hover:text-white transition-colors duration-300"
              aria-label="Instagram"
            >
              <Instagram className="h-5 w-5 md:h-6 md:w-6" />
            </a>
            <a
              href="https://twitter.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-white/80 hover:text-white transition-colors duration-300"
              aria-label="Twitter"
            >
              <Twitter className="h-5 w-5 md:h-6 md:w-6" />
            </a>
            <a
              href="https://linkedin.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-white/80 hover:text-white transition-colors duration-300"
              aria-label="LinkedIn"
            >
              <Linkedin className="h-5 w-5 md:h-6 md:w-6" />
            </a>
            <a
              href="https://youtube.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-white/80 hover:text-white transition-colors duration-300"
              aria-label="YouTube"
            >
              <Youtube className="h-5 w-5 md:h-6 md:w-6" />
            </a>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
