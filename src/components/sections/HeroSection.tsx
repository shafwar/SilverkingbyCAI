"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { gsap } from "gsap";

interface HeroSectionProps {
  shouldAnimate?: boolean;
}

export default function HeroSection({ shouldAnimate = true }: HeroSectionProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const headlineRef = useRef<HTMLHeadingElement>(null);
  const subtitleRef = useRef<HTMLParagraphElement>(null);
  const ctaRef = useRef<HTMLDivElement>(null);
  const statsRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasAnimated, setHasAnimated] = useState(false);

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end start"],
  });

  const opacity = useTransform(scrollYProgress, [0, 0.5], [1, 0]);
  const scale = useTransform(scrollYProgress, [0, 0.5], [1, 1.05]);
  const videoOpacity = useTransform(scrollYProgress, [0, 0.3], [1, 0.3]);

  useEffect(() => {
    setIsLoaded(true);
  }, []);

  useEffect(() => {
    if (!shouldAnimate || hasAnimated) return;

    const ctx = gsap.context(() => {
      const masterTL = gsap.timeline({
        defaults: {
          ease: "power4.out",
        },
        onComplete: () => {
          setHasAnimated(true);
        },
      });

      // Video fade in
      if (videoRef.current) {
        masterTL.fromTo(
          videoRef.current,
          { scale: 1.15, opacity: 0 },
          { scale: 1, opacity: 1, duration: 2.5, ease: "power3.out" },
          0
        );
      }

      // Headline words animation
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
            duration: 1.8,
            stagger: { amount: 1.2, from: "start", ease: "power3.inOut" },
            ease: "expo.out",
            transformOrigin: "center bottom",
          },
          0.3
        );
      }

      // Subtitle
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
          duration: 1.6,
          ease: "expo.out",
        },
        1.2
      );

      // CTA Buttons
      masterTL.fromTo(
        ".cta-button",
        { opacity: 0, y: 60, scale: 0.7, filter: "blur(6px)" },
        {
          opacity: 1,
          y: 0,
          scale: 1,
          filter: "blur(0px)",
          duration: 1.4,
          stagger: 0.2,
          ease: "elastic.out(1.2, 0.6)",
        },
        1.6
      );

      // Stats container
      masterTL.fromTo(
        statsRef.current,
        { opacity: 0, x: 60 },
        { opacity: 1, x: 0, duration: 1.8, ease: "expo.out" },
        0.8
      );

      // Stat items cascade
      const statItems = statsRef.current?.querySelectorAll(".stat-item");
      if (statItems) {
        masterTL.fromTo(
          statItems,
          { opacity: 0, x: 30, scale: 0.95 },
          {
            opacity: 1,
            x: 0,
            scale: 1,
            duration: 1.2,
            stagger: { amount: 0.4, ease: "power2.out" },
            ease: "back.out(1.4)",
          },
          1.4
        );

        // Number counter animation
        statItems.forEach((item, index) => {
          const number = item.querySelector(".stat-number");
          if (number && number.textContent) {
            const text = number.textContent.trim();
            const hasPlus = text.includes("+");
            const hasPercent = text.includes("%");

            const numMatch = text.match(/[\d.]+/);
            if (!numMatch) return;

            const numValue = parseFloat(numMatch[0]);
            if (isNaN(numValue)) return;

            masterTL.fromTo(
              number,
              { innerText: 0 },
              {
                innerText: numValue,
                duration: 2,
                ease: "power2.out",
                snap: { innerText: numValue > 100 ? 1 : 0.01 },
                onUpdate: function () {
                  const elem = this.targets()[0] as HTMLElement;
                  let current = parseFloat(elem.innerText);

                  let formatted;
                  if (numValue >= 1000) {
                    formatted = Math.floor(current).toString();
                  } else if (numValue > 10) {
                    formatted = current.toFixed(2);
                  } else {
                    formatted = current.toFixed(2);
                  }

                  if (hasPlus) formatted += "+";
                  if (hasPercent) formatted += "%";
                  elem.innerText = formatted;
                },
              },
              1.8 + index * 0.2
            );
          }
        });

        // Hover interactions
        statItems.forEach((item) => {
          const element = item as HTMLElement;

          element.addEventListener("mouseenter", () => {
            gsap.to(element, {
              x: -8,
              duration: 0.4,
              ease: "power2.out",
            });
          });

          element.addEventListener("mouseleave", () => {
            gsap.to(element, {
              x: 0,
              duration: 0.4,
              ease: "elastic.out(1, 0.5)",
            });
          });
        });
      }
    });

    return () => ctx.revert();
  }, [shouldAnimate, hasAnimated]);

  return (
    <section ref={containerRef} className="relative min-h-screen w-full overflow-hidden bg-black">
      {/* Video Background */}
      <motion.div
        style={{ opacity: isLoaded ? videoOpacity : 0, scale }}
        className="absolute inset-0 z-0 will-change-transform"
      >
        <video
          ref={videoRef}
          autoPlay
          loop
          muted
          playsInline
          preload="auto"
          className="absolute inset-0 h-full w-full object-cover"
        >
          <source src="/videos/hero/hero-background.mp4" type="video/mp4" />
        </video>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1.5, ease: "easeOut" }}
          className="absolute inset-0 bg-gradient-to-b from-black/45 via-black/35 to-black/55"
        />
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1.5, delay: 0.3, ease: "easeOut" }}
          className="absolute inset-0 bg-gradient-to-r from-black/50 via-transparent to-black/35"
        />
      </motion.div>

      {/* Content */}
      <div className="relative z-10 flex min-h-screen items-center">
        <div className="mx-auto w-full max-w-[1600px] px-6 md:px-10 lg:px-14 xl:px-20">
          {/* Main content - left side */}
          <div className="max-w-[900px]">
            {/* Headline */}
            <h1
              ref={headlineRef}
              className="mb-6 font-sans text-[2.25rem] sm:text-[2.75rem] md:text-[3.5rem] lg:text-[4rem] xl:text-[4.75rem] 2xl:text-[5.25rem] font-light tracking-[-0.025em] leading-[1.15] text-white"
              style={{ perspective: "1000px" }}
            >
              <span className="word inline-block" style={{ transformStyle: "preserve-3d" }}>
                Where
              </span>{" "}
              <span
                className="word inline-block font-semibold bg-gradient-to-r from-[#FFD700] via-[#FDB931] to-[#FFD700] bg-clip-text text-transparent"
                style={{ transformStyle: "preserve-3d" }}
              >
                rare
              </span>{" "}
              <span
                className="word inline-block font-semibold bg-gradient-to-r from-[#FFD700] via-[#FDB931] to-[#FFD700] bg-clip-text text-transparent"
                style={{ transformStyle: "preserve-3d" }}
              >
                metals
              </span>{" "}
              <span className="word inline-block" style={{ transformStyle: "preserve-3d" }}>
                become
              </span>{" "}
              <span
                className="word inline-block font-semibold"
                style={{ transformStyle: "preserve-3d" }}
              >
                timeless
              </span>{" "}
              <span
                className="word inline-block font-semibold"
                style={{ transformStyle: "preserve-3d" }}
              >
                value,
              </span>{" "}
              <span className="word inline-block" style={{ transformStyle: "preserve-3d" }}>
                forged
              </span>{" "}
              <span className="word inline-block" style={{ transformStyle: "preserve-3d" }}>
                with
              </span>{" "}
              <span
                className="word inline-block font-semibold bg-gradient-to-r from-white via-[#E8E8E8] to-white bg-clip-text text-transparent"
                style={{ transformStyle: "preserve-3d" }}
              >
                precision.
              </span>
            </h1>

            {/* Subtitle */}
            <p
              ref={subtitleRef}
              className="mb-10 max-w-[85%] font-sans text-[1rem] md:text-[1.0625rem] leading-[1.7] font-light text-white/75"
            >
              Expert manufacturing of{" "}
              <span className="font-medium text-white/90">gold, silver, and palladium</span>{" "}
              products. <span className="font-medium text-white/90">Custom bar fabrication</span>,{" "}
              uncompromising purity, and{" "}
              <span className="font-medium text-white/90">QR-verified authenticity</span>
              —redefining trust in precious metals.
            </p>

            {/* CTA Buttons */}
            <div ref={ctaRef} className="flex flex-col sm:flex-row gap-3.5">
              <a
                href="/about"
                className="cta-button group inline-flex items-center justify-center gap-2 rounded-full bg-white px-6 py-3 font-sans text-[0.875rem] font-medium text-black transition-all duration-300 hover:shadow-[0_20px_50px_-10px_rgba(255,255,255,0.3)]"
              >
                <span>Explore Products</span>
                <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
              </a>

              <a
                href="/verify"
                className="cta-button inline-flex items-center justify-center gap-2 rounded-full border border-white/20 bg-white/5 px-6 py-3 font-sans text-[0.875rem] font-medium text-white backdrop-blur-sm transition-all duration-300 hover:border-white/30 hover:bg-white/10"
              >
                Verify Authenticity
              </a>
            </div>
          </div>

          {/* Stats - Simple & Clean - Only 3 items - NO CONTAINER */}
          <div className="hidden md:flex absolute right-6 lg:right-14 xl:right-20 top-1/2 -translate-y-1/2 pointer-events-auto">
            <div ref={statsRef} className="flex flex-col gap-8 relative">
              {/* Decorative line */}
              <div className="absolute -left-4 top-0 bottom-0 w-[1px] bg-gradient-to-b from-transparent via-[#FFD700]/20 to-transparent" />

              {/* Stat 1 - Products Verified */}
              <div className="stat-item text-right cursor-pointer">
                <p className="stat-number font-sans text-[3rem] font-bold leading-none text-white tracking-tight">
                  10000+
                </p>
                <p className="mt-2 font-sans text-[0.7rem] font-light leading-tight text-white/40 uppercase tracking-widest">
                  Products Verified
                </p>
              </div>

              {/* Stat 2 - Purity Guaranteed */}
              <div className="stat-item text-right cursor-pointer">
                <p className="stat-number font-sans text-[3rem] font-bold leading-none bg-gradient-to-r from-[#FFD700] via-[#FDB931] to-[#FFD700] bg-clip-text text-transparent tracking-tight">
                  99.99%
                </p>
                <p className="mt-2 font-sans text-[0.7rem] font-light leading-tight text-white/40 uppercase tracking-widest">
                  Purity Guaranteed
                </p>
              </div>

              {/* Stat 3 - ISO Certified */}
              <div className="stat-item text-right cursor-pointer">
                <p className="font-sans text-[2rem] font-bold leading-none text-white tracking-tight">
                  ISO 9001
                </p>
                <p className="mt-2 font-sans text-[0.7rem] font-light leading-tight text-white/40 uppercase tracking-widest">
                  Certified Excellence
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Fade */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 2, delay: 1 }}
        className="absolute bottom-0 left-0 right-0 h-36 bg-gradient-to-t from-black via-black/50 to-transparent pointer-events-none"
      />
    </section>
  );
}
