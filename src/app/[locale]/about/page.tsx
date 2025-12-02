"use client";

import { Suspense, useMemo, useRef, useEffect } from "react";
import dynamic from "next/dynamic";
import Navbar from "@/components/layout/Navbar";
import Link from "next/link";
import { useTranslations, useLocale } from "next-intl";
import { getR2UrlClient } from "@/utils/r2-url";
import { PageLoadingSkeleton } from "@/components/ui/PageLoadingSkeleton";

// Lazy load CertificateCard to improve initial page load
const CertificateCard = dynamic(() => import("@/components/ui/CertificateCard"), {
  loading: () => null, // Don't show loader for this small component
  ssr: true,
});
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
  Twitter,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

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

  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("fade-in-visible");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.1 }
    );

    observer.observe(element);

    return () => {
      observer.unobserve(element);
    };
  }, []);

  return (
    <div ref={containerRef} className="group relative min-h-[360px] fade-in">
      <div className="relative flex h-full flex-col rounded-3xl border border-white/10 bg-gradient-to-br from-white/5 to-white/[0.02] p-10 backdrop-blur-xl transition-all duration-300 hover:border-luxury-gold/40 hover:shadow-[0px_20px_60px_-30px_rgba(212,175,55,0.4)]">
        <div className="relative z-10">
          <div
            className={`mb-6 inline-flex rounded-2xl bg-gradient-to-br ${feature.gradient} p-4 shadow-lg`}
          >
            <feature.icon className="h-6 w-6 text-white" />
          </div>
          <h3 className="mb-3 text-2xl font-semibold text-white">{feature.title}</h3>
          <p className="text-luxury-silver/80 leading-relaxed">{feature.description}</p>
        </div>
      </div>
    </div>
  );
};

const StepCard = ({ step, index }: { step: StepItem; index: number }) => {
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("fade-in-visible");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.1 }
    );

    observer.observe(element);

    return () => {
      observer.unobserve(element);
    };
  }, []);

  return (
    <div ref={containerRef} className="relative min-h-[340px] fade-in">
      <div className="relative flex h-full flex-col items-center text-center">
        {index < 2 && (
          <div className="absolute left-full top-12 hidden h-0.5 w-12 bg-gradient-to-r from-luxury-gold/50 to-transparent md:block" />
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
      </div>
    </div>
  );
};

const ValueCard = ({ value, index }: { value: ValueItem; index: number }) => {
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("fade-in-visible");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.1 }
    );

    observer.observe(element);

    return () => {
      observer.unobserve(element);
    };
  }, []);

  return (
    <div ref={containerRef} className="min-h-[220px] fade-in">
      <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-white/10 via-white/[0.03] to-transparent p-8 text-center backdrop-blur-xl shadow-[0_20px_70px_-30px_rgba(0,0,0,0.7)] transition-transform duration-300 hover:scale-[1.02]">
        <value.icon className="mx-auto mb-4 h-10 w-10 text-luxury-gold" />
        <h3 className="mb-2 text-lg font-semibold text-luxury-gold">{value.title}</h3>
        <p className="text-sm text-luxury-silver/70">{value.description}</p>
      </div>
    </div>
  );
};

export default function AboutPage() {
  const t = useTranslations("about");
  const tNav = useTranslations("nav");
  const locale = useLocale();
  const pageRef = useRef<HTMLDivElement | null>(null);
  const heroRef = useRef<HTMLDivElement | null>(null);
  const noiseOverlay = useRef<HTMLDivElement | null>(null);
  const gradientOverlay = useRef<HTMLDivElement | null>(null);

  const featureItems = useMemo<FeatureItem[]>(
    () => [
      {
        icon: Shield,
        title: t("whyChoose.features.authenticity.title"),
        description: t("whyChoose.features.authenticity.description"),
        gradient: "from-emerald-500 to-teal-600",
      },
      {
        icon: Sparkles,
        title: t("whyChoose.features.quality.title"),
        description: t("whyChoose.features.quality.description"),
        gradient: "from-luxury-gold to-luxury-lightGold",
      },
      {
        icon: Award,
        title: t("whyChoose.features.craftsmanship.title"),
        description: t("whyChoose.features.craftsmanship.description"),
        gradient: "from-luxury-silver to-white",
      },
    ],
    [t]
  );

  const stepItems = useMemo<StepItem[]>(
    () => [
      {
        number: t("howItWorks.steps.step1.number"),
        icon: QrCode,
        title: t("howItWorks.steps.step1.title"),
        description: t("howItWorks.steps.step1.description"),
      },
      {
        number: t("howItWorks.steps.step2.number"),
        icon: Eye,
        title: t("howItWorks.steps.step2.title"),
        description: t("howItWorks.steps.step2.description"),
      },
      {
        number: t("howItWorks.steps.step3.number"),
        icon: Shield,
        title: t("howItWorks.steps.step3.title"),
        description: t("howItWorks.steps.step3.description"),
      },
    ],
    [t]
  );

  const valueItems = useMemo<ValueItem[]>(
    () => [
      {
        icon: Shield,
        title: t("story.values.authenticity.title"),
        description: t("story.values.authenticity.description"),
      },
      {
        icon: Award,
        title: t("story.values.excellence.title"),
        description: t("story.values.excellence.description"),
      },
      {
        icon: Target,
        title: t("story.values.precision.title"),
        description: t("story.values.precision.description"),
      },
    ],
    [t]
  );

  const premiumGradient = useMemo(
    () =>
      "linear-gradient(160deg, rgba(18,18,18,0.94) 0%, rgba(10,10,10,0.98) 55%, rgba(6,6,6,1) 100%)",
    []
  );

  // Removed heavy GSAP animations - using lightweight IntersectionObserver + CSS transitions

  useEffect(() => {
    if (!noiseOverlay.current) return;

    noiseOverlay.current.style.backgroundImage =
      'url(\'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" preserveAspectRatio="none"><filter id="n"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="3"/></filter><rect width="100%" height="100%" filter="url(%23n)" opacity="0.15"/></svg>\')';
  }, []);

  // Global IntersectionObserver for all fade-in elements
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("fade-in-visible");
            // Unobserve after animation to improve performance
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.1, rootMargin: "0px 0px -50px 0px" }
    );

    // Observe all elements with fade-in class that don't already have an observer
    const fadeInElements = document.querySelectorAll(".fade-in:not(.fade-in-visible)");
    fadeInElements.forEach((el) => observer.observe(el));

    return () => {
      fadeInElements.forEach((el) => observer.unobserve(el));
    };
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
      <section className="relative flex min-h-[100vh] items-center px-6 pb-24 pt-24 md:pt-32">
        {/* Fullscreen Video Background */}
        <div className="absolute inset-0 z-0 overflow-hidden">
          <video
            className="absolute inset-0 h-full w-full object-cover brightness-[0.85] scale-105"
            src={getR2UrlClient("/videos/hero/gold-footage.mp4")}
            autoPlay
            loop
            muted
            playsInline
            preload="metadata"
            disablePictureInPicture
            disableRemotePlayback
          />
          {/* Optimized Vignette Layer - Stable, optimal, and consistent */}
          <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/50 to-black/80 z-20" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,rgba(0,0,0,0.5)_60%,rgba(0,0,0,0.85)_100%)] z-20" />
          <div className="absolute inset-x-0 top-0 h-32 md:h-40 lg:h-48 bg-gradient-to-b from-black/80 via-black/40 to-transparent pointer-events-none z-20" />
          <div className="absolute inset-x-0 bottom-0 h-48 md:h-56 lg:h-64 bg-gradient-to-t from-black/90 via-black/60 to-transparent pointer-events-none z-20" />
          <div className="absolute inset-y-0 left-0 w-32 md:w-40 lg:w-48 bg-gradient-to-r from-black/70 via-black/30 to-transparent pointer-events-none z-20" />
          <div className="absolute inset-y-0 right-0 w-32 md:w-40 lg:w-48 bg-gradient-to-l from-black/70 via-black/30 to-transparent pointer-events-none z-20" />
        </div>

        {/* Subtle light overlay */}
        <div className="absolute inset-0 z-0 bg-gradient-to-b from-white/5 via-transparent to-transparent" />

        <div
          className="relative z-10 mx-auto flex w-full max-w-[1200px] flex-col items-center text-center"
          ref={heroRef}
        >
          <div className="space-y-10 md:max-w-[680px] hero-fade-in">
            <div className="inline-flex items-center justify-center gap-3 rounded-full border border-white/10 bg-white/5 px-6 py-2 text-[12px] uppercase tracking-[0.45em] text-luxury-silver/60 backdrop-blur">
              <span className="h-1 w-1 rounded-full bg-luxury-gold" />
              {t("hero.badge")}
              <span className="h-1 w-1 rounded-full bg-luxury-gold" />
            </div>
            <h1 className="text-[40px] font-sans font-semibold leading-tight tracking-[0.01em] text-white md:text-[68px] lg:text-[88px]">
              <span className="block text-base uppercase ml-5 tracking-[0.75em] text-luxury-silver/70 md:text-3xl font-sans">
                {t("hero.title")}
              </span>
            </h1>
            <p className="mx-auto max-w-3xl text-sm font-sans font-light leading-relaxed text-luxury-silver/70 md:text-base">
              {t("hero.subtitle")}
            </p>
          </div>

          <div className="pointer-events-none absolute left-1/2 top-full z-0 h-45 w-[70%] -translate-x-1/2 -translate-y-20 rounded-full bg-gradient-to-r from-white/10 via-transparent to-transparent blur-xl" />
        </div>
      </section>

      {/* Why Choose Us Section */}
      <section className="relative overflow-hidden py-28 md:py-36 px-6">
        <div className="absolute inset-0 z-0 bg-gradient-to-b from-[#171717] via-[#0f0f0f] to-[#060606]" />
        <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-luxury-black via-transparent to-transparent" />
        <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-luxury-black via-transparent to-transparent" />

        <div className="relative z-10 mx-auto max-w-[1320px]">
          <div className="mb-20 text-center fade-in">
            <h2 className="mb-5 text-4xl md:text-5xl lg:text-6xl font-light tracking-tight">
              <span className="text-white">{t("whyChoose.title")}</span>{" "}
              <span className="bg-gradient-to-r from-luxury-gold to-luxury-lightGold bg-clip-text text-transparent">
                {t("whyChoose.titleBold")}
              </span>
            </h2>
            <p className="mx-auto max-w-3xl text-lg md:text-xl text-luxury-silver/70">
              {t("whyChoose.subtitle")}
            </p>
          </div>

          <div className="grid grid-cols-1 gap-10 md:grid-cols-3 md:gap-12">
            {featureItems.map((feature, index) => (
              <FeatureCard key={feature.title} feature={feature} index={index} />
            ))}
          </div>
        </div>
      </section>

      {/* Certificate Section - Improved spacing and responsive layout */}
      <section className="relative py-12 sm:py-16 md:py-20 lg:py-24 px-4 sm:px-6 md:px-8 flex flex-col items-center justify-center w-full">
        {/* Subtle gradient background */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#161616] via-[#0f0f0f] to-[#0a0a0a]" />
        <div className="absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-luxury-black via-transparent to-transparent" />
        <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-luxury-black via-transparent to-transparent" />

        {/* Container with proper max-width and responsive padding */}
        <div className="relative z-10 mx-auto w-full max-w-5xl px-2 sm:px-4 md:px-6">
          <Suspense fallback={null}>
            <CertificateCard />
          </Suspense>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="relative py-28 md:py-36 px-6">
        <div className="absolute inset-0 bg-gradient-to-b from-[#151515] via-[#0e0e0e] to-[#050505]" />
        <div className="absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-luxury-black via-transparent to-transparent" />
        <div className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-luxury-black via-transparent to-transparent" />

        <div className="relative mx-auto max-w-[1320px]">
          <div className="mb-20 text-center space-y-5 fade-in">
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-light tracking-tight">
              <span className="text-white">{t("howItWorks.title")}</span>{" "}
              <span className="bg-gradient-to-r from-luxury-gold to-luxury-silver bg-clip-text text-transparent">
                {t("howItWorks.titleBold")}
              </span>
            </h2>
            <p className="mx-auto max-w-3xl text-lg md:text-xl text-luxury-silver/70">
              {t("howItWorks.subtitle")}
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
      <section className="relative py-28 md:py-36 px-6">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-[#141414] via-[#0c0c0c] to-[#050505]" />
          <div className="absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-luxury-black via-transparent to-transparent" />
          <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-luxury-black via-transparent to-transparent" />
        </div>

        <div className="relative mx-auto grid max-w-[1320px] grid-cols-1 items-center gap-16 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-8 fade-in">
            <h2 className="text-4xl md:text-5xl font-light tracking-tight text-luxury-gold">
              {t("story.title")}
            </h2>
            <div className="space-y-5 text-base leading-relaxed text-luxury-silver/80">
              <p>{t("story.paragraph1")}</p>
              <p>{t("story.paragraph2")}</p>
              <p>{t("story.paragraph3")}</p>
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
      <section className="relative py-32 md:py-40 px-6">
        <div className="mx-auto max-w-[1320px]">
          <div className="group relative overflow-hidden rounded-[44px] border border-white/8 bg-[#090909] p-[1.5px] shadow-[0_70px_140px_-60px_rgba(0,0,0,0.85)] fade-in">
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
                <span className="text-white">{t("cta.title")}</span>
                <br />
                <span className="bg-gradient-to-r from-luxury-gold via-luxury-lightGold to-luxury-silver bg-clip-text text-transparent">
                  {t("cta.titleBold")}
                </span>
              </h2>
              <p className="mx-auto mb-12 max-w-2xl text-lg md:text-xl text-luxury-silver/75">
                {t("cta.subtitle")}
              </p>

              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-center">
                <Link
                  href="/verify"
                  prefetch={true}
                  className="group relative inline-flex items-center justify-center gap-3 overflow-hidden rounded-full bg-gradient-to-r from-luxury-gold to-luxury-lightGold px-9 py-4 text-base font-semibold text-black transition-all duration-300 hover:shadow-[0_25px_70px_-30px_rgba(212,175,55,0.6)]"
                >
                  <Shield className="h-5 w-5" />
                  <span>{t("cta.startVerification")}</span>
                  <ArrowRight className="h-5 w-5 transition-transform duration-300 group-hover:translate-x-1" />
                </Link>

                <Link
                  href="/"
                  prefetch={true}
                  className="inline-flex items-center justify-center gap-3 rounded-full border border-white/20 bg-white/[0.04] px-8 py-4 text-base font-semibold text-white backdrop-blur-sm transition-all duration-300 hover:border-white/40 hover:bg-white/10"
                >
                  {t("cta.backToHome")}
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer Section – Consistent with What We Do page */}
      <section className="relative px-6 md:px-8 lg:px-12 py-16 md:py-20 lg:py-24">
        {/* Footer Navigation & Social */}
        <div className="relative z-10 mx-auto w-full max-w-[1320px] flex flex-col md:flex-row items-start md:items-end justify-between gap-8 md:gap-0">
          {/* Left: Navigation Links */}
          <div className="flex flex-wrap items-center gap-6 md:gap-8 fade-in">
            <span className="text-white/40 text-sm">×</span>
            <Link
              href={`/${locale}/what-we-do`}
              prefetch={true}
              className="text-sm md:text-base font-medium text-white/80 hover:text-white transition-colors duration-300"
            >
              {tNav("whatWeDo")}
            </Link>
            <Link
              href={`/${locale}/authenticity`}
              prefetch={true}
              className="text-sm md:text-base font-medium text-white/80 hover:text-white transition-colors duration-300"
            >
              {tNav("authenticity")}
            </Link>
            <Link
              href={`/${locale}/products`}
              prefetch={true}
              className="text-sm md:text-base font-medium text-white/80 hover:text-white transition-colors duration-300"
            >
              {tNav("products")}
            </Link>
            <Link
              href={`/${locale}/about`}
              prefetch={true}
              className="text-sm md:text-base font-medium text-white/80 hover:text-white transition-colors duration-300"
            >
              {tNav("aboutUs")}
            </Link>
          </div>

          {/* Right: Social Media Icons */}
          <div className="flex items-center gap-4 md:gap-5 fade-in">
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
          </div>
        </div>
      </section>
    </div>
  );
}
