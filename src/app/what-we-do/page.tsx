"use client";

import { useRef, useEffect, useMemo } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { motion, useInView, AnimatePresence, type Variants } from "framer-motion";
import { Sparkles, FlaskConical, Shield, ArrowRight, Package, Hash, QrCode } from "lucide-react";
import Navbar from "@/components/layout/Navbar";
import Link from "next/link";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

const revealVariants: Variants = {
  initial: { opacity: 0, y: 40 },
  animate: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1], staggerChildren: 0.15 },
  },
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
};

const hoverSpring = {
  scale: 1.02,
  transition: {
    type: "spring" as const,
    stiffness: 220,
    damping: 18,
  },
} as const;

const processSteps = [
  {
    id: 1,
    title: "Ore Selection",
    icon: Package,
    description: "Premium raw materials sourced from certified refineries worldwide",
  },
  {
    id: 2,
    title: "Melting & Purification",
    icon: FlaskConical,
    description: "Advanced smelting process ensuring 99.99% purity standards",
  },
  {
    id: 3,
    title: "Casting",
    icon: Sparkles,
    description: "Precision casting in controlled environments for consistent quality",
  },
  {
    id: 4,
    title: "Serial Coding",
    icon: Hash,
    description: "Unique serial number assignment for complete traceability",
  },
  {
    id: 5,
    title: "QR Sealing",
    icon: QrCode,
    description: "Encrypted QR code generation and permanent sealing",
  },
  {
    id: 6,
    title: "Packaging",
    icon: Package,
    description: "Premium protective packaging with tamper-evident seals",
  },
  {
    id: 7,
    title: "Verification-Ready",
    icon: Shield,
    description: "Complete audit trail ready for instant verification",
  },
];

const FeatureCard = ({
  feature,
  index,
}: {
  feature: { title: string; description: string; icon: typeof Sparkles; gradient: string };
  index: number;
}) => {
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

const ProcessStepCard = ({ step, index }: { step: (typeof processSteps)[0]; index: number }) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const isInView = useInView(containerRef, { amount: 0.3, margin: "-25% 0px" });
  const Icon = step.icon;

  return (
    <div ref={containerRef} className="relative min-h-[280px]">
      <AnimatePresence mode="sync">
        {isInView && (
          <motion.div
            key={`${step.id}-step`}
            variants={presenceVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            custom={index}
            whileHover={hoverSpring}
            className="relative flex h-full flex-col rounded-2xl border border-white/10 bg-gradient-to-br from-white/10 via-white/[0.03] to-transparent p-6 backdrop-blur-xl transition-all duration-500 hover:border-luxury-gold/40 hover:shadow-[0px_20px_60px_-30px_rgba(212,175,55,0.5)]"
          >
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-luxury-gold/20 to-luxury-silver/10 text-luxury-gold">
              <Icon className="h-6 w-6" />
            </div>
            <div className="mb-2 flex items-center gap-2">
              <span className="text-xs font-semibold text-luxury-gold">
                {String(index + 1).padStart(2, "0")}
              </span>
              <h3 className="font-sans text-lg font-semibold text-white">{step.title}</h3>
            </div>
            <p className="text-sm leading-relaxed text-luxury-silver/70">{step.description}</p>

            {index < processSteps.length - 1 && (
              <div className="absolute right-0 top-1/2 hidden h-[2px] w-full translate-x-full translate-y-[-50%] bg-gradient-to-r from-luxury-gold/50 to-transparent xl:block" />
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default function WhatWeDoPage() {
  const pageRef = useRef<HTMLDivElement | null>(null);
  const heroRef = useRef<HTMLDivElement | null>(null);
  const noiseOverlay = useRef<HTMLDivElement | null>(null);
  const gradientOverlay = useRef<HTMLDivElement | null>(null);
  const sectionsRef = useRef<(HTMLDivElement | null)[]>([]);

  const featureItems = useMemo(
    () => [
      {
        title: "Gold, Silver & Palladium Fabrication",
        description:
          "High-purity bullion manufacturing from 5gr to 500gr. Expert craftsmanship meeting LBMA standards.",
        icon: Sparkles,
        gradient: "from-luxury-gold to-luxury-lightGold",
      },
      {
        title: "Advanced Purity Lab",
        description:
          "Spectrometry testing ensuring 99.99% quality. ISO 9001 certified facilities with transparent compliance.",
        icon: FlaskConical,
        gradient: "from-luxury-silver to-white",
      },
      {
        title: "QR-Authenticated Security",
        description:
          "Each bar integrated with unique, encrypted traceability. Blockchain-ready verification system.",
        icon: Shield,
        gradient: "from-luxury-gold to-luxury-lightGold",
      },
    ],
    []
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

        if (heroRef.current) {
          const heroTimeline = gsap.timeline({ defaults: { ease: "power3.out" } });
          heroTimeline.fromTo(
            heroRef.current.querySelectorAll("[data-hero]") || [],
            { autoAlpha: 0, y: 40 },
            { autoAlpha: 1, y: 0, duration: 0.8, stagger: 0.15 }
          );
        }
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
      <Navbar />

      {/* Hero Section */}
      <section
        ref={(element) => {
          sectionsRef.current[0] = element as HTMLDivElement | null;
        }}
        className="relative flex min-h-[100vh] items-center px-6 pb-24 pt-24 md:pt-32"
      >
        {/* Video Background */}
        <div className="absolute inset-0 z-0 overflow-hidden">
          <video
            className="absolute inset-0 h-full w-full object-cover brightness-[0.85] scale-105"
            src="/videos/hero/hero-background.mp4"
            autoPlay
            loop
            muted
            playsInline
            preload="metadata"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-luxury-black/40 via-luxury-black/60 to-luxury-black" />
          <div className="absolute inset-0 bg-gradient-to-t from-luxury-black via-luxury-black/80 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-r from-luxury-black/50 via-transparent to-luxury-black/30" />
          <div className="absolute inset-x-0 bottom-0 h-64 bg-gradient-to-t from-luxury-black via-luxury-black/95 to-transparent" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,rgba(10,10,10,0.4)_100%)]" />
        </div>

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
            <motion.h1
              data-hero
              className="text-[40px] font-semibold leading-tight tracking-[0.01em] text-white md:text-[68px] lg:text-[88px]"
            >
              <span className="block text-base uppercase tracking-[0.75em] text-luxury-silver/70 md:text-3xl mb-4">
                Crafting Precious Metals
              </span>
            </motion.h1>
            <motion.p
              data-hero
              className="mx-auto max-w-3xl text-sm font-light leading-relaxed text-luxury-silver/70 md:text-base"
            >
              From gold & silver fabrication to QR-verified authenticity, Silver King engineers
              trust at molecular levels.
            </motion.p>
            <motion.div data-hero></motion.div>
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section
        id="features"
        ref={(element) => {
          sectionsRef.current[1] = element as HTMLDivElement | null;
        }}
        className="relative overflow-hidden py-28 md:py-36 px-6"
      >
        <div className="absolute inset-0 z-0 bg-gradient-to-b from-[#171717] via-[#0f0f0f] to-[#060606]" />
        <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-luxury-black via-transparent to-transparent" />
        <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-luxury-black via-transparent to-transparent" />

        <div className="relative z-10 mx-auto max-w-[1320px]">
          <motion.div className="mb-20 text-center" data-reveal>
            <h2 className="mb-5 text-4xl md:text-5xl lg:text-6xl font-light tracking-tight">
              <span className="text-white">Our</span>{" "}
              <span className="bg-gradient-to-r from-luxury-gold to-luxury-lightGold bg-clip-text text-transparent">
                Capabilities
              </span>
            </h2>
            <p className="mx-auto max-w-3xl text-lg md:text-xl text-luxury-silver/70">
              Precision engineering meets uncompromising quality standards
            </p>
          </motion.div>

          <div className="grid grid-cols-1 gap-10 md:grid-cols-3 md:gap-12">
            {featureItems.map((feature, index) => (
              <FeatureCard key={feature.title} feature={feature} index={index} />
            ))}
          </div>
        </div>
      </section>

      {/* Process Timeline */}
      <section
        ref={(element) => {
          sectionsRef.current[2] = element as HTMLDivElement | null;
        }}
        className="relative overflow-hidden border-y border-white/10 bg-gradient-to-b from-[#151515] via-[#0e0e0e] to-[#050505] py-28 md:py-36 px-6"
      >
        <div className="absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-luxury-black via-transparent to-transparent" />
        <div className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-luxury-black via-transparent to-transparent" />

        <div className="relative mx-auto max-w-[1320px]">
          <motion.div className="mb-20 text-center" data-reveal>
            <h2 className="mb-5 text-4xl md:text-5xl lg:text-6xl font-light tracking-tight">
              <span className="text-white">Our</span>{" "}
              <span className="bg-gradient-to-r from-luxury-gold to-luxury-lightGold bg-clip-text text-transparent">
                Process
              </span>
            </h2>
            <p className="mx-auto max-w-3xl text-lg md:text-xl text-luxury-silver/70">
              Seven stages of precision manufacturing
            </p>
          </motion.div>

          <div className="relative grid gap-6 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
            {processSteps.map((step, index) => (
              <ProcessStepCard key={step.id} step={step} index={index} />
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section
        ref={(element) => {
          sectionsRef.current[3] = element as HTMLDivElement | null;
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

            <div className="relative z-10 px-10 py-14 text-center md:px-16 md:py-16 lg:px-24 lg:py-20">
              <h2 className="mb-6 text-4xl md:text-5xl lg:text-6xl font-light tracking-tight">
                <span className="text-white">Ready to Experience</span>
                <br />
                <span className="bg-gradient-to-r from-luxury-gold via-luxury-lightGold to-luxury-silver bg-clip-text text-transparent">
                  Excellence?
                </span>
              </h2>
              <p className="mx-auto mb-12 max-w-2xl text-lg md:text-xl text-luxury-silver/75">
                Discover our complete collection of verified precious metal bars
              </p>

              <Link
                href="/products"
                className="group relative inline-flex items-center justify-center gap-3 overflow-hidden rounded-full bg-gradient-to-r from-luxury-gold to-luxury-lightGold px-9 py-4 text-base font-semibold text-black transition-all duration-300 hover:shadow-[0_35px_90px_-35px_rgba(212,175,55,0.8)]"
              >
                <span>View Our Products</span>
                <ArrowRight className="h-5 w-5 transition-transform duration-300 group-hover:translate-x-1" />
                <motion.span
                  className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/30 to-white/0 opacity-0"
                  initial={{ opacity: 0 }}
                  whileHover={{ opacity: 0.25 }}
                  transition={{ duration: 0.4, ease: "easeOut" }}
                />
              </Link>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
