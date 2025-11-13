"use client";

import { useEffect, useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { gsap } from "gsap";

export default function HeroSection() {
  const containerRef = useRef<HTMLDivElement>(null);
  const headlineRef = useRef<HTMLDivElement>(null);
  const subtitleRef = useRef<HTMLParagraphElement>(null);
  const ctaRef = useRef<HTMLDivElement>(null);

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end start"],
  });

  const opacity = useTransform(scrollYProgress, [0, 0.5], [1, 0]);
  const scale = useTransform(scrollYProgress, [0, 0.5], [1, 1.05]);

  useEffect(() => {
    const ctx = gsap.context(() => {
      const headlineLines = headlineRef.current?.querySelectorAll(".headline-line");

      if (headlineLines) {
        gsap.fromTo(
          headlineLines,
          { opacity: 0, y: 50, rotationX: -20 },
          {
            opacity: 1,
            y: 0,
            rotationX: 0,
            duration: 1,
            stagger: 0.12,
            ease: "power3.out",
            delay: 0.3,
          }
        );
      }

      if (subtitleRef.current) {
        gsap.fromTo(
          subtitleRef.current,
          { opacity: 0, y: 25 },
          {
            opacity: 1,
            y: 0,
            duration: 0.9,
            ease: "power2.out",
            delay: 1.1,
          }
        );
      }

      if (ctaRef.current) {
        const buttons = ctaRef.current.querySelectorAll(".cta-button");
        gsap.fromTo(
          buttons,
          { opacity: 0, y: 25, scale: 0.96 },
          {
            opacity: 1,
            y: 0,
            scale: 1,
            duration: 0.7,
            stagger: 0.12,
            ease: "back.out(1.2)",
            delay: 1.4,
          }
        );
      }
    });

    return () => ctx.revert();
  }, []);

  return (
    <section ref={containerRef} className="relative min-h-screen w-full overflow-hidden bg-black">
      {/* Video Background */}
      <motion.div style={{ opacity, scale }} className="absolute inset-0 z-0">
        <video
          autoPlay
          loop
          muted
          playsInline
          preload="auto"
          className="absolute inset-0 h-full w-full object-cover"
        >
          <source src="/videos/hero/hero-background.mp4" type="video/mp4" />
        </video>

        {/* Overlay - Let video show through */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/45 via-black/35 to-black/55" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/50 via-transparent to-black/35" />
      </motion.div>

      {/* Content */}
      <div className="relative z-10 flex min-h-screen items-center">
        <div className="mx-auto w-full max-w-[1400px] px-6 md:px-10 lg:px-14 xl:px-16">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-start lg:items-center">
            {/* Left - Main Content */}
            <div className="lg:col-span-8 pt-6 lg:pt-0">
              {/* Headline - Proportional Size */}
              <div ref={headlineRef} className="mb-6">
                <div className="headline-line">
                  <h1 className="font-sans text-[2.75rem] sm:text-[3.5rem] md:text-[4.25rem] lg:text-[5rem] xl:text-[5.5rem] font-normal tracking-[-0.025em] leading-[0.92] text-white mb-0">
                    Digital products
                  </h1>
                </div>
                <div className="headline-line">
                  <h1 className="font-sans text-[2.75rem] sm:text-[3.5rem] md:text-[4.25rem] lg:text-[5rem] xl:text-[5.5rem] font-normal tracking-[-0.025em] leading-[0.92] mb-0">
                    that{" "}
                    <span className="bg-gradient-to-r from-[#FFD700] via-[#FDB931] to-[#FFD700] bg-clip-text text-transparent">
                      matter,
                    </span>
                  </h1>
                </div>
                <div className="headline-line">
                  <h1 className="font-sans text-[2.75rem] sm:text-[3.5rem] md:text-[4.25rem] lg:text-[5rem] xl:text-[5.5rem] font-normal tracking-[-0.025em] leading-[0.92] text-white mb-0">
                    crafted by people
                  </h1>
                </div>
                <div className="headline-line">
                  <h1 className="font-sans text-[2.75rem] sm:text-[3.5rem] md:text-[4.25rem] lg:text-[5rem] xl:text-[5.5rem] font-normal tracking-[-0.025em] leading-[0.92] mb-0">
                    who{" "}
                    <span className="bg-gradient-to-r from-white via-[#E8E8E8] to-white bg-clip-text text-transparent">
                      care.
                    </span>
                  </h1>
                </div>
              </div>

              {/* Subtitle - Smaller & Cleaner */}
              <p
                ref={subtitleRef}
                className="mb-10 max-w-[550px] font-sans text-[0.9375rem] leading-[1.65] font-light text-white/70"
              >
                Since 2024, forging authenticity in precious metals with industry leaders. We fuse
                craftsmanship with QR-based verification to push boundaries.
              </p>

              {/* CTA Buttons */}
              <div ref={ctaRef} className="flex flex-col sm:flex-row gap-3.5">
                <a
                  href="#products"
                  className="cta-button group inline-flex items-center justify-center gap-2 rounded-full bg-white px-6 py-3 font-sans text-[0.875rem] font-medium text-black transition-all duration-300 hover:scale-[1.02] hover:shadow-[0_15px_40px_-10px_rgba(255,255,255,0.25)]"
                >
                  <span>Explore Products</span>
                  <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5" />
                </a>

                <a
                  href="/verify"
                  className="cta-button inline-flex items-center justify-center gap-2 rounded-full border border-white/20 bg-white/5 px-6 py-3 font-sans text-[0.875rem] font-medium text-white backdrop-blur-sm transition-all duration-300 hover:border-white/30 hover:bg-white/10"
                >
                  Verify Authenticity
                </a>
              </div>
            </div>

            {/* Right - Sidebar */}
            <div className="lg:col-span-4">
              <motion.div
                initial={{ opacity: 0, x: 25 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.8, delay: 1.6 }}
                className="space-y-8"
              >
                {/* Trusted By */}
                <div>
                  <h3 className="mb-4 font-sans text-[0.6875rem] font-semibold uppercase tracking-[0.1em] text-white/40">
                    TRUSTED BY
                  </h3>
                  <div className="grid grid-cols-2 gap-y-3.5 gap-x-5">
                    {["vodafone", "rubrik", "OneSignal", "glean", "salesforce", "vmware"].map(
                      (company) => (
                        <div
                          key={company}
                          className="font-sans text-[0.9375rem] font-normal leading-tight text-white/60 transition-colors duration-200 hover:text-white/85"
                        >
                          {company}
                        </div>
                      )
                    )}
                  </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="stat-card rounded-xl bg-white/[0.04] p-4 backdrop-blur-sm transition-all duration-300 hover:bg-white/[0.07]">
                    <p className="font-sans text-[2rem] font-semibold leading-none text-white">
                      10K+
                    </p>
                    <p className="mt-2 font-sans text-[0.75rem] font-light leading-tight text-white/45">
                      Products Verified
                    </p>
                  </div>

                  <div className="stat-card rounded-xl bg-white/[0.04] p-4 backdrop-blur-sm transition-all duration-300 hover:bg-white/[0.07]">
                    <p className="font-sans text-[2rem] font-semibold leading-none text-white">
                      99.99%
                    </p>
                    <p className="mt-2 font-sans text-[0.75rem] font-light leading-tight text-white/45">
                      Purity Guaranteed
                    </p>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </div>
      </div>

      {/* Scroll Indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1, delay: 1.9 }}
        className="absolute bottom-8 left-1/2 z-20 -translate-x-1/2"
      >
        <div className="relative h-10 w-6 rounded-full border border-white/20">
          <motion.div
            animate={{ y: [0, 10, 0], opacity: [0.4, 1, 0.4] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            className="absolute left-1/2 top-2 h-1.5 w-1.5 -translate-x-1/2 rounded-full bg-white"
          />
        </div>
      </motion.div>

      {/* Bottom Fade */}
      <div className="absolute bottom-0 left-0 right-0 h-36 bg-gradient-to-t from-black via-black/50 to-transparent" />
    </section>
  );
}
