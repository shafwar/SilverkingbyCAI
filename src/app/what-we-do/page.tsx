"use client";

import { useRef, useMemo, useState, useEffect, forwardRef } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { motion, useInView, AnimatePresence, type Variants } from "framer-motion";
import {
  Sparkles,
  FlaskConical,
  Shield,
  ArrowRight,
  Github,
  Instagram,
  Twitter,
  Linkedin,
  Youtube,
} from "lucide-react";
import Navbar from "@/components/layout/Navbar";
import Link from "next/link";
import Image from "next/image";

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

// Narrative Section with Dynamic Images & Mobile Swipe
const NarrativeImageSection = forwardRef<
  HTMLDivElement,
  {
    columns: ReadonlyArray<{ readonly title: string; readonly description: string }>;
    cards: ReadonlyArray<{
      readonly label: string;
      readonly caption: string;
      readonly images: readonly string[];
    }>;
  }
>(({ columns, cards }, ref) => {
  const [hoveredColumnIndex, setHoveredColumnIndex] = useState<number | null>(null);
  const [imageIndices, setImageIndices] = useState<number[]>([0, 0, 0]);

  // Auto-rotate images on hover for desktop with smooth slide transition
  useEffect(() => {
    if (hoveredColumnIndex === null) return;

    // Varied timing for each column (2s, 2.5s, 3s) for more natural feel
    const timings = [2000, 2500, 3000];
    const timing = timings[hoveredColumnIndex] || 2500;

    const interval = setInterval(() => {
      setImageIndices((prev) => {
        const newIndices = [...prev];
        const card = cards[hoveredColumnIndex];
        if (card) {
          // Sequential rotation for smoother experience
          const currentIndex = prev[hoveredColumnIndex];
          const nextIndex = (currentIndex + 1) % card.images.length;
          newIndices[hoveredColumnIndex] = nextIndex;
        }
        return newIndices;
      });
    }, timing);

    return () => clearInterval(interval);
  }, [hoveredColumnIndex, cards]);

  return (
    <section
      ref={ref}
      className="relative border-t border-white/5 bg-gradient-to-b from-[#050505] via-[#050505] to-[#030303] px-6 py-16 md:py-20 lg:py-24"
    >
      <div className="relative z-10 mx-auto max-w-[1320px]">
        {/* Desktop: 3-column grid with dynamic hover images - Pixelmatters style */}
        <div className="hidden md:grid md:grid-cols-3 md:gap-6 lg:gap-8 xl:gap-10" data-reveal>
          {columns.map((item, idx) => {
            const card = cards[idx];
            const currentImageIndex = imageIndices[idx];
            const currentImage = card.images[currentImageIndex] || card.images[0];

            return (
              <motion.div
                key={item.title}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.3 }}
                transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1], delay: idx * 0.08 }}
                onMouseEnter={() => setHoveredColumnIndex(idx)}
                onMouseLeave={() => setHoveredColumnIndex(null)}
                className="flex flex-col gap-6 group"
              >
                {/* Top narrative copy - Pixelmatters spacing with balanced height */}
                <div className="space-y-3 w-full flex flex-col">
                  <h3 className="text-xl md:text-2xl lg:text-[26px] xl:text-[28px] font-semibold leading-[1.2] text-white min-h-[2.5em]">
                    {item.title}
                  </h3>
                  <p className="text-sm md:text-[14px] lg:text-[15px] leading-[1.6] text-luxury-silver/80 min-h-[4.8em]">
                    {item.description}
                  </p>
                </div>

                {/* Image tile with dynamic slide transition on hover - Pixelmatters style */}
                <motion.div
                  whileHover={{ scale: 1.01, y: -2 }}
                  transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                  className="relative w-full overflow-hidden rounded-lg border border-white/10 bg-black/60 flex-shrink-0"
                  style={{ aspectRatio: "3/2" }}
                >
                  {/* Image container with smooth slide transition - Pixelmatters style */}
                  <div className="relative w-full h-full overflow-hidden">
                    <AnimatePresence mode="wait" initial={false}>
                      <motion.div
                        key={`${idx}-${currentImageIndex}`}
                        initial={{ opacity: 0, x: 30, scale: 1.05 }}
                        animate={{ opacity: 1, x: 0, scale: 1 }}
                        exit={{ opacity: 0, x: -30, scale: 0.95 }}
                        transition={{
                          duration: 0.75,
                          ease: [0.25, 0.46, 0.45, 0.94],
                        }}
                        className="absolute inset-0"
                        style={{ willChange: "transform, opacity" }}
                      >
                        <Image
                          src={currentImage}
                          alt={card.label}
                          fill
                          className="object-cover"
                          sizes="(min-width: 1024px) 33vw, 100vw"
                          priority={idx === 0}
                        />
                      </motion.div>
                    </AnimatePresence>
                  </div>
                  <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent pointer-events-none" />

                  <div className="absolute inset-x-0 bottom-0 p-4 md:p-5 pointer-events-none">
                    <p className="text-sm md:text-base font-semibold text-white mb-1">
                      {card.label}
                    </p>
                    <p className="text-xs md:text-sm leading-[1.5] text-luxury-silver/85">
                      {card.caption}
                    </p>
                  </div>
                </motion.div>
              </motion.div>
            );
          })}
        </div>

        {/* Mobile: Pixelmatters-style layout - Text stacked, then single large image */}
        <div className="md:hidden">
          {/* Text sections – stacked vertically like Pixelmatters */}
          <div className="mb-16 space-y-14" data-reveal>
            {columns.map((item, idx) => (
              <motion.div
                key={item.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.3 }}
                transition={{ duration: 0.6, delay: idx * 0.1, ease: [0.22, 1, 0.36, 1] }}
                className="space-y-3"
              >
                <h3 className="text-[32px] font-semibold leading-[1.2] text-white">{item.title}</h3>
                <p className="text-[15px] leading-[1.6] text-luxury-silver/80">
                  {item.description}
                </p>
              </motion.div>
            ))}
          </div>

          {/* Single large image – Pixelmatters style full-width edge-to-edge */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
            className="relative w-screen left-1/2 right-1/2 -ml-[50vw] -mr-[50vw] overflow-hidden"
            style={{ aspectRatio: "4/3" }}
            data-reveal
          >
            <Image
              src={cards[0].images[0]}
              alt={cards[0].label}
              fill
              className="object-cover"
              sizes="100vw"
              priority
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent" />

            <div className="absolute inset-x-0 bottom-0 p-5">
              <p className="text-base font-semibold text-white mb-1.5">{cards[0].label}</p>
              <p className="text-sm leading-relaxed text-luxury-silver/85">{cards[0].caption}</p>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
});

NarrativeImageSection.displayName = "NarrativeImageSection";

// End of file helpers

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

  const narrativeColumns = [
    {
      title: "Craft from raw bullion",
      description:
        "We transform responsibly sourced gold, silver, and palladium into investment-grade bars using tightly controlled refining and casting lines.",
    },
    {
      title: "Engineer authenticity into every bar",
      description:
        "Each piece is born with a unique serial, lab-backed purity data, and encrypted QR that ties physical metal to its digital identity.",
    },
    {
      title: "Scale verified precious metal flows",
      description:
        "From mint to vault to client, telemetry and scan events keep partners aligned on provenance, custody, and lifecycle events.",
    },
  ] as const;

  const narrativeCards = [
    {
      label: "Gold fabrication lines",
      caption:
        "High‑throughput casting, edge finishing, and surface treatment tuned for bullion batches.",
      images: [
        "/images/pexels-3d-render-1058120333-33539240.jpg",
        "/images/pexels-sejio402-29336321.jpg",
        "/images/silverking-gold.jpeg",
      ],
    },
    {
      label: "Silver & palladium refinement",
      caption:
        "Spectrometry‑backed purification with ISO‑aligned quality controls for industrial and retail bars.",
      images: [
        "/images/pexels-michael-steinberg-95604-386318.jpg",
        "/images/pexels-sejio402-29336326.jpg",
        "/images/silverking-gold.jpeg",
      ],
    },
    {
      label: "Digital verification stack",
      caption:
        "QR issuance, scan logging, and risk signals wired directly into Silver King Command.",
      images: [
        "/images/pexels-sejio402-29336327.jpg",
        "/images/pexels-sejio402-29336321.jpg",
        "/images/silverking-gold.jpeg",
      ],
    },
  ] as const;

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

  return (
    <div
      ref={pageRef}
      className="min-h-screen bg-luxury-black text-white selection:bg-luxury-gold/20 selection:text-white"
      style={{ backgroundImage: premiumGradient }}
    >
      {/* Global Background Noise & Gradient */}
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

      {/* Shared Navbar */}
      <Navbar />

      {/* Hero Background – metal crafting hands video, matching products hero style */}
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <div className="absolute inset-0">
          {/* Fallback dark gradient */}
          <div className="absolute inset-0 bg-gradient-to-br from-luxury-black via-luxury-black/95 to-luxury-black z-0" />

          <video
            autoPlay
            loop
            muted
            playsInline
            preload="auto"
            className="absolute inset-0 h-full w-full object-cover transition-opacity duration-1000 will-change-transform z-10"
            style={{ transform: "scale(1.05)", transformOrigin: "center center" }}
          >
            <source src="/videos/hero/metal crafting hands.mp4" type="video/mp4" />
          </video>

          {/* Dark overlays for readability */}
          <div className="absolute inset-0 bg-gradient-to-b from-black/55 via-black/45 to-black/65 z-20" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,rgba(10,10,10,0.6)_100%)] z-20" />
          <div className="absolute inset-x-0 bottom-0 h-40 md:h-52 lg:h-64 bg-gradient-to-t from-luxury-black via-luxury-black/60 to-transparent pointer-events-none z-20" />
        </div>
      </div>

      {/* Hero Section – typography & layout aligned with products hero */}
      <section
        ref={(element) => {
          sectionsRef.current[0] = element as HTMLDivElement | null;
        }}
        className="relative px-6 md:px-8 lg:px-12 pt-32 pb-24 md:pt-40 md:pb-32 lg:pt-48 lg:pb-40 min-h-[80vh] md:min-h-[90vh] lg:min-h-screen flex items-center"
      >
        <div className="relative z-10 w-full max-w-[1400px] mx-auto">
          <motion.div
            ref={heroRef}
            variants={revealVariants}
            initial="initial"
            animate="animate"
            className="text-left max-w-4xl"
          >
            <motion.h1
              className="text-[1.5rem] md:text-[3.5rem] lg:text-[2.5rem] xl:text-[3.5rem] 2xl:text-[4rem] font-light leading-[1.15] tracking-[-0.02em] md:tracking-[-0.03em] text-white"
              data-hero
            >
              Engineering the lifecycle
              <br />
              <span className="font-normal">of every Silver King bar.</span>
            </motion.h1>
            <motion.p
              data-hero
              className="mt-6 max-w-xl text-sm md:text-base font-light leading-relaxed text-luxury-silver/80"
            >
              From ore selection and purification to serial coding, QR sealing, and verification, we
              choreograph each step so every bar carries a verifiable story of origin and custody.
            </motion.p>
          </motion.div>
        </div>
      </section>

      {/* Narrative + Image Grid – Pixelmatters-style with dynamic images */}
      <NarrativeImageSection
        ref={(element: HTMLDivElement | null) => {
          sectionsRef.current[1] = element;
        }}
        columns={narrativeColumns}
        cards={narrativeCards}
      />

      {/* Impact Section – similar to Pixelmatters "The impact you can expect" */}
      <section
        ref={(element) => {
          sectionsRef.current[2] = element as HTMLDivElement | null;
        }}
        className="relative border-t border-white/10 bg-gradient-to-b from-[#050505] via-[#050505] to-[#020202] px-6 py-20 md:py-24 lg:py-28"
      >
        <div className="relative mx-auto flex max-w-[1320px] flex-col gap-16 md:flex-row md:items-start md:justify-between">
          {/* Left title block */}
          <div className="max-w-md" data-reveal>
            <h2 className="text-4xl md:text-5xl lg:text-[52px] font-light leading-tight tracking-tight text-white">
              The impact
              <br />
              you can expect
            </h2>
          </div>

          {/* Right list of impacts */}
          <div className="flex-1 space-y-10 md:space-y-6" data-reveal>
            {[
              {
                title: "Traceable supply chains",
                body: "Every Silver King bar carries a verifiable story of origin, custody, and verification events, giving partners confidence in each transfer.",
              },
              {
                title: "Operational clarity",
                body: "Live telemetry from scans turns scattered movements into structured data, helping you see what is moving, where, and through whom.",
              },
              {
                title: "Customer trust at scale",
                body: "A single tap on the QR reveals authenticity, provenance, and product details, building long‑term trust with collectors and institutions.",
              },
              {
                title: "Compliance‑ready records",
                body: "Audit‑friendly logs and standardized identifiers simplify reporting across jurisdictions and support stringent regulatory frameworks.",
              },
            ].map((item, idx, arr) => (
              <div key={item.title}>
                <div className="grid gap-4 md:grid-cols-[minmax(0,0.5fr)_minmax(0,1fr)] md:gap-8">
                  <p className="text-sm font-semibold text-white md:text-base">{item.title}</p>
                  <p className="text-sm leading-relaxed text-luxury-silver/80 md:text-[15px]">
                    {item.body}
                  </p>
                </div>
                {idx < arr.length - 1 && (
                  <div className="mt-6 h-px w-full bg-gradient-to-r from-white/15 via-white/5 to-transparent" />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Centered CTA pill */}
        <div className="mt-16 flex justify-center" data-reveal>
          <button
            type="button"
            className="group inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/[0.04] px-6 py-2 text-xs font-medium text-white backdrop-blur-md transition-all duration-300 hover:border-white/60 hover:bg-white/[0.08]"
          >
            <span>Explore Silver King advantages</span>
            <span className="text-lg leading-none group-hover:translate-y-[1px] transition-transform">
              ↓
            </span>
          </button>
        </div>
      </section>

      {/* Features Section – Our Capabilities */}
      <section
        id="features"
        ref={(element) => {
          sectionsRef.current[3] = element as HTMLDivElement | null;
        }}
        className="relative overflow-hidden py-20 md:py-28 lg:py-32 px-6"
      >
        {/* Soft background without hard band at the top */}
        <div className="absolute inset-0 z-0 bg-gradient-to-b from-[#111111] via-[#060606] to-[#020202]" />
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

      {/* Footer Section – Pixelmatters style with video background */}
      <section
        ref={(element) => {
          sectionsRef.current[4] = element as HTMLDivElement | null;
        }}
        className="relative min-h-[60vh] md:min-h-[70vh] flex flex-col justify-between px-6 md:px-8 lg:px-12 py-16 md:py-20 lg:py-24 overflow-hidden"
      >
        {/* Video Background */}
        <div className="absolute inset-0 z-0">
          <video
            autoPlay
            loop
            muted
            playsInline
            className="absolute inset-0 w-full h-full object-cover"
          >
            <source src="/videos/hero/molten metal slow motion.mp4" type="video/mp4" />
          </video>
          {/* Dark overlay for text readability */}
          <div className="absolute inset-0 bg-gradient-to-b from-luxury-black/85 via-luxury-black/75 to-luxury-black/85" />
        </div>

        {/* Main Content - Centered */}
        <div className="relative z-10 mx-auto max-w-4xl text-center flex-1 flex items-center justify-center">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
            className="text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-light leading-tight tracking-tight text-white"
          >
            Let's raise the bar,
            <br />
            <span className="bg-gradient-to-r from-luxury-gold via-luxury-lightGold to-luxury-gold bg-clip-text text-transparent">
              together.
            </span>
          </motion.h2>
        </div>

        {/* Footer Navigation & Social - Bottom */}
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
              href="/what-we-do"
              className="text-sm md:text-base font-medium text-white/80 hover:text-white transition-colors duration-300"
            >
              What we do
            </Link>
            <Link
              href="/authenticity"
              className="text-sm md:text-base font-medium text-white/80 hover:text-white transition-colors duration-300"
            >
              Authenticity
            </Link>
            <Link
              href="/products"
              className="text-sm md:text-base font-medium text-white/80 hover:text-white transition-colors duration-300"
            >
              Products
            </Link>
            <Link
              href="/about"
              className="text-sm md:text-base font-medium text-white/80 hover:text-white transition-colors duration-300"
            >
              About us
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
