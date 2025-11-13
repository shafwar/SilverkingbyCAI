"use client";

import { motion, useScroll, useTransform } from "framer-motion";
import { ArrowRight, Shield, Sparkles } from "lucide-react";
import { useRef } from "react";

export default function HeroSection() {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end start"],
  });

  const opacity = useTransform(scrollYProgress, [0, 0.5], [1, 0]);
  const scale = useTransform(scrollYProgress, [0, 0.5], [1, 1.1]);

  return (
    <section
      ref={containerRef}
      className="relative min-h-screen w-full overflow-hidden bg-black"
    >
      {/* Video Background with Parallax Effect */}
      <motion.div
        style={{ opacity, scale }}
        className="absolute inset-0 z-0"
      >
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

        {/* Sophisticated Multi-Layer Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-black/90 via-black/70 to-black/85" />
        <div className="absolute inset-0 bg-gradient-to-tr from-luxury-black/50 via-transparent to-luxury-gold/10" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,rgba(0,0,0,0.8)_100%)]" />
        
        {/* Subtle Noise Texture for Premium Feel */}
        <div className="absolute inset-0 opacity-[0.015] mix-blend-overlay bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIzMDAiIGhlaWdodD0iMzAwIj48ZmlsdGVyIGlkPSJhIiB4PSIwIiB5PSIwIj48ZmVUdXJidWxlbmNlIGJhc2VGcmVxdWVuY3k9Ii43NSIgc3RpdGNoVGlsZXM9InN0aXRjaCIgdHlwZT0iZnJhY3RhbE5vaXNlIi8+PGZlQ29sb3JNYXRyaXggdHlwZT0ic2F0dXJhdGUiIHZhbHVlcz0iMCIvPjwvZmlsdGVyPjxwYXRoIGQ9Ik0wIDBoMzAwdjMwMEgweiIgZmlsdGVyPSJ1cmwoI2EpIiBvcGFjaXR5PSIuMDUiLz48L3N2Zz4=')]" />
      </motion.div>

      {/* Main Content Container */}
      <div className="relative z-10 flex min-h-screen items-center">
        <div className="mx-auto w-full max-w-[1440px] px-6 md:px-12 lg:px-16">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
            
            {/* Left Column - Main Content */}
            <div className="lg:col-span-7 xl:col-span-8">
              {/* Premium Badge */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
                className="mb-6 md:mb-8"
              >
                <div className="inline-flex items-center gap-2 rounded-full border border-luxury-gold/30 bg-luxury-gold/5 px-4 py-2 backdrop-blur-sm">
                  <Sparkles className="h-4 w-4 text-luxury-gold" />
                  <span className="text-sm font-medium tracking-wide text-luxury-gold">
                    Since 2024 • Premium Authentication
                  </span>
                </div>
              </motion.div>

              {/* Main Headline */}
              <motion.h1
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.3 }}
                className="mb-6 md:mb-8"
              >
                <span className="block text-5xl md:text-6xl lg:text-7xl xl:text-8xl font-light tracking-tight leading-[1.1]">
                  <span className="text-white">Forging</span>
                  <br />
                  <span className="bg-gradient-to-r from-luxury-gold via-luxury-lightGold to-luxury-silver bg-clip-text text-transparent">
                    Authenticity
                  </span>
                  <br />
                  <span className="text-white/90">in Precious</span>
                  <br />
                  <span className="bg-gradient-to-r from-luxury-silver via-white to-luxury-lightSilver bg-clip-text text-transparent">
                    Metals
                  </span>
                </span>
              </motion.h1>

              {/* Subheadline */}
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.5 }}
                className="mb-10 md:mb-12 max-w-2xl text-lg md:text-xl lg:text-2xl font-light leading-relaxed text-luxury-lightSilver/80"
              >
                A new standard of trust, powered by{" "}
                <span className="text-luxury-gold font-medium">QR-based verification</span>.
                Every piece tells a story of{" "}
                <span className="text-luxury-silver font-medium">authenticity</span> and{" "}
                <span className="text-luxury-gold font-medium">craftsmanship</span>.
              </motion.p>

              {/* CTA Buttons */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.7 }}
                className="flex flex-col sm:flex-row gap-4"
              >
                {/* Primary CTA */}
                <a
                  href="#products"
                  className="group relative inline-flex items-center justify-center gap-3 overflow-hidden rounded-full bg-gradient-to-r from-luxury-gold to-luxury-lightGold px-8 py-4 text-base font-semibold text-black transition-all duration-300 hover:scale-[1.02] hover:shadow-[0_20px_60px_-15px_rgba(212,175,55,0.5)] active:scale-[0.98]"
                >
                  <span className="relative z-10">Explore Products</span>
                  <ArrowRight className="relative z-10 h-5 w-5 transition-transform duration-300 group-hover:translate-x-1" />
                  <div className="absolute inset-0 bg-gradient-to-r from-luxury-lightGold to-luxury-gold opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                </a>

                {/* Secondary CTA */}
                <a
                  href="/verify"
                  className="group inline-flex items-center justify-center gap-3 rounded-full border-2 border-luxury-silver/30 bg-white/5 px-8 py-4 text-base font-semibold text-white backdrop-blur-sm transition-all duration-300 hover:border-luxury-silver hover:bg-white/10 hover:shadow-[0_20px_60px_-15px_rgba(192,192,192,0.3)] active:scale-[0.98]"
                >
                  <Shield className="h-5 w-5 text-luxury-silver transition-transform duration-300 group-hover:scale-110" />
                  <span>Verify Authenticity</span>
                </a>
              </motion.div>

              {/* Trust Indicators */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 1, delay: 1 }}
                className="mt-12 md:mt-16 flex flex-wrap items-center gap-6 md:gap-8"
              >
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.5)]" />
                  <span className="text-sm text-luxury-silver/60">
                    99.99% Purity Guaranteed
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-luxury-gold shadow-[0_0_10px_rgba(212,175,55,0.5)]" />
                  <span className="text-sm text-luxury-silver/60">
                    QR-Verified Authentication
                  </span>
                </div>
              </motion.div>
            </div>

            {/* Right Column - Partner Logos & Stats */}
            <div className="lg:col-span-5 xl:col-span-4">
              <motion.div
                initial={{ opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.8, delay: 0.9 }}
                className="space-y-8"
              >
                {/* Stats Cards */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="group relative overflow-hidden rounded-2xl border border-luxury-gold/20 bg-luxury-gold/5 p-6 backdrop-blur-sm transition-all duration-300 hover:border-luxury-gold/40 hover:bg-luxury-gold/10">
                    <div className="relative z-10">
                      <p className="text-3xl md:text-4xl font-bold bg-gradient-to-br from-luxury-gold to-luxury-lightGold bg-clip-text text-transparent">
                        10K+
                      </p>
                      <p className="mt-2 text-sm text-luxury-silver/70">
                        Products Verified
                      </p>
                    </div>
                    <div className="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-luxury-gold/10 blur-3xl transition-all duration-300 group-hover:bg-luxury-gold/20" />
                  </div>

                  <div className="group relative overflow-hidden rounded-2xl border border-luxury-silver/20 bg-luxury-silver/5 p-6 backdrop-blur-sm transition-all duration-300 hover:border-luxury-silver/40 hover:bg-luxury-silver/10">
                    <div className="relative z-10">
                      <p className="text-3xl md:text-4xl font-bold bg-gradient-to-br from-luxury-silver to-white bg-clip-text text-transparent">
                        100%
                      </p>
                      <p className="mt-2 text-sm text-luxury-silver/70">
                        Authentic Guarantee
                      </p>
                    </div>
                    <div className="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-luxury-silver/10 blur-3xl transition-all duration-300 group-hover:bg-luxury-silver/20" />
                  </div>
                </div>

                {/* Premium Features List */}
                <div className="space-y-4 rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm">
                  <h3 className="text-sm font-semibold uppercase tracking-wider text-luxury-gold">
                    Premium Features
                  </h3>
                  <ul className="space-y-3">
                    {[
                      "Blockchain-Backed Verification",
                      "Instant QR Authentication",
                      "Lifetime Authenticity Guarantee",
                      "Global Certification Network",
                    ].map((feature, index) => (
                      <motion.li
                        key={feature}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.5, delay: 1.1 + index * 0.1 }}
                        className="flex items-start gap-3"
                      >
                        <div className="mt-1 h-1.5 w-1.5 rounded-full bg-luxury-gold shadow-[0_0_8px_rgba(212,175,55,0.6)]" />
                        <span className="text-sm leading-relaxed text-luxury-lightSilver/80">
                          {feature}
                        </span>
                      </motion.li>
                    ))}
                  </ul>
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
        transition={{ duration: 1, delay: 1.5 }}
        className="absolute bottom-8 left-1/2 z-20 -translate-x-1/2"
      >
        <div className="flex flex-col items-center gap-2">
          <span className="text-xs uppercase tracking-wider text-luxury-silver/50">
            Scroll to explore
          </span>
          <div className="relative h-12 w-7 rounded-full border-2 border-luxury-gold/30">
            <motion.div
              animate={{
                y: [0, 16, 0],
                opacity: [0.5, 1, 0.5],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut",
              }}
              className="absolute left-1/2 top-2 h-2 w-2 -translate-x-1/2 rounded-full bg-luxury-gold shadow-[0_0_10px_rgba(212,175,55,0.8)]"
            />
          </div>
        </div>
      </motion.div>

      {/* Bottom Gradient Fade */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-black to-transparent" />
    </section>
  );
}

