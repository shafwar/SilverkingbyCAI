"use client";

import { useLayoutEffect, useRef } from "react";
import { motion } from "framer-motion";
import { gsap } from "gsap";
import { useTranslations } from "next-intl";

/** Max ms to wait for font before starting splash (avoid blocking on very slow networks) */
const FONT_READY_TIMEOUT_MS = 2000;

interface SplashScreenProps {
  onComplete: () => void;
}

export default function SplashScreen({ onComplete }: SplashScreenProps) {
  const t = useTranslations("home");
  const containerRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLDivElement>(null);
  const gsapCtxRef = useRef<ReturnType<typeof gsap.context> | null>(null);

  // Wait for font to load before animating, so splash never shows fallback font
  useLayoutEffect(() => {
    const letters = textRef.current?.querySelectorAll(".letter");
    const textContainer = textRef.current;

    if (!letters?.length || !textContainer || !containerRef.current) return;

    // CRITICAL: Hide letters immediately so no flash of wrong font
    gsap.set(letters, {
      opacity: 0,
      y: 30,
      filter: "blur(15px)",
      scale: 0.9,
    });

    const runTimeline = () => {
      const container = containerRef.current;
      const textEl = textRef.current;
      if (!container || !textEl) return;

      gsapCtxRef.current = gsap.context(() => {
        const tl = gsap.timeline();

        tl.to(
          letters,
          {
            opacity: 1,
            y: 0,
            filter: "blur(0px)",
            scale: 1,
            duration: 0.7,
            stagger: {
              amount: 1.6,
              ease: "power2.inOut",
            },
            ease: "expo.out",
          },
          0.1
        );

        tl.to(
          textEl,
          { scale: 1.015, duration: 0.3, ease: "power2.out" },
          "-=0.4"
        );
        tl.to(
          textEl,
          { scale: 1, duration: 0.3, ease: "power2.inOut" },
          "-=0.15"
        );
        tl.to({}, { duration: 0.3 });
        tl.to(
          container,
          {
            opacity: 0,
            duration: 0.6,
            ease: "power3.inOut",
            onComplete: () => {
              if (typeof document !== "undefined") {
                document.body.classList.add("splash-complete");
              }
              onComplete();
            },
          },
          "+=0.2"
        );
      }, container);
    };

    // Start animation only after fonts are ready (Geist loaded), or after timeout
    Promise.race([
      document.fonts.ready,
      new Promise<void>((r) => setTimeout(r, FONT_READY_TIMEOUT_MS)),
    ]).then(runTimeline);

    return () => {
      gsapCtxRef.current?.revert();
      gsapCtxRef.current = null;
    };
  }, [onComplete]);

  const fontStack = "var(--font-geist-sans), system-ui, sans-serif";

  return (
    <motion.div
      ref={containerRef}
      data-splash-screen
      className="font-sans fixed inset-0 z-[9999] flex items-center justify-center bg-black"
      initial={{ opacity: 1 }}
      animate={{ opacity: 1 }}
      style={{ 
        fontFamily: fontStack,
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: '100vw',
        height: '100vh',
        pointerEvents: 'auto',
        willChange: 'opacity',
        zIndex: 9999,
        opacity: 1, // CRITICAL: Ensure container is visible from start
      }}
    >
      <div className="absolute inset-0 bg-black" />

      {/* Main text */}
      <div
        ref={textRef}
        className="relative z-10 text-center px-6"
        style={{ perspective: "1000px", fontFamily: fontStack }}
      >
        <div className="font-sans text-[2rem] sm:text-[2.5rem] md:text-[3rem] lg:text-[3.5rem] font-light tracking-tight leading-none text-white" style={{ fontFamily: fontStack }}>
          {"Silver King by CAI".split("").map((char, index) => (
            <span
              key={index}
              className="letter inline-block"
              style={{
                transformStyle: "preserve-3d",
                display: char === " " ? "inline" : "inline-block",
                minWidth: char === " " ? "0.5em" : "auto",
              }}
            >
              {char === " " ? "\u00A0" : char}
            </span>
          ))}
        </div>

        {/* Subtle tagline */}
        <motion.div
          initial={{ opacity: 0, y: 20, visibility: "hidden" }}
          animate={{ opacity: 0.85, y: 0, visibility: "visible" }}
          transition={{ duration: 0.8, delay: 1.2, ease: "easeOut" }}
          className="mt-6 font-sans text-[0.75rem] md:text-[0.875rem] font-light tracking-[0.3em] text-white/85"
          style={{ fontFamily: fontStack }}
        >
          {t("tagline")}
        </motion.div>

        {/* Decorative gradient line - positioned relative to tagline */}
        <motion.div
          initial={{ scaleX: 0, opacity: 0, visibility: "hidden" }}
          animate={{ scaleX: 1, opacity: 1, visibility: "visible" }}
          transition={{ duration: 1.2, delay: 1.4, ease: "easeInOut" }}
          className="mt-8 mx-auto w-32 md:w-40 h-[1px] bg-gradient-to-r from-transparent via-white/30 to-transparent"
        />
      </div>
    </motion.div>
  );
}
