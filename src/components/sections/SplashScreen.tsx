"use client";

import { useLayoutEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { getNetworkTier } from "@/utils/network-profile";

const FONT_READY_TIMEOUT_MS = 600;
const FONT_READY_TIMEOUT_MEDIUM_MS = 350;

interface SplashScreenProps {
  onComplete: () => void;
}

export default function SplashScreen({ onComplete }: SplashScreenProps) {
  const t = useTranslations("home");
  const containerRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLDivElement>(null);
  const gsapCtxRef = useRef<{ revert: () => void } | null>(null);

  useLayoutEffect(() => {
    const tier = getNetworkTier();
    const container = containerRef.current;
    const textContainer = textRef.current;
    const letters = textContainer?.querySelectorAll(".letter");

    const finish = () => {
      document.body.classList.add("splash-complete");
      onComplete();
    };

    if (tier === "slow") {
      const tId = window.setTimeout(finish, 260);
      return () => window.clearTimeout(tId);
    }

    if (!letters?.length || !textContainer || !container) {
      finish();
      return;
    }

    let cancelled = false;

    const run = async () => {
      const { gsap } = await import("gsap");
      if (cancelled) return;

      gsap.set(letters, { opacity: 0, y: 24, scale: 0.94 });

      const fontTimeout =
        tier === "medium" ? FONT_READY_TIMEOUT_MEDIUM_MS : FONT_READY_TIMEOUT_MS;
      const staggerAmount = tier === "medium" ? 0.75 : 1.35;
      const holdBeforeFade = tier === "medium" ? 0.1 : 0.22;
      const fadeOutDuration = tier === "medium" ? 0.42 : 0.55;

      const startTimeline = () => {
        if (cancelled || !containerRef.current) return;

        gsapCtxRef.current = gsap.context(() => {
          const tl = gsap.timeline();

          tl.to(
            letters,
            {
              opacity: 1,
              y: 0,
              scale: 1,
              duration: tier === "medium" ? 0.5 : 0.62,
              stagger: { amount: staggerAmount, ease: "power2.inOut" },
              ease: "expo.out",
            },
            0.06
          );

          tl.to(textContainer, { scale: 1.012, duration: 0.22, ease: "power2.out" }, "-=0.3");
          tl.to(textContainer, { scale: 1, duration: 0.18, ease: "power2.inOut" }, "-=0.1");
          tl.to({}, { duration: holdBeforeFade });
          tl.to(container, {
            opacity: 0,
            duration: fadeOutDuration,
            ease: "power3.inOut",
            onComplete: finish,
          });
        }, containerRef);
      };

      Promise.race([
        document.fonts?.ready ?? Promise.resolve(),
        new Promise<void>((r) => setTimeout(r, fontTimeout)),
      ]).then(startTimeline);
    };

    void run();

    return () => {
      cancelled = true;
      gsapCtxRef.current?.revert();
      gsapCtxRef.current = null;
    };
  }, [onComplete]);

  const fontStack = "var(--font-geist-sans), sans-serif";

  return (
    <div
      ref={containerRef}
      data-splash-screen
      className="font-sans fixed inset-0 z-[9999] flex items-center justify-center bg-black"
      style={{ fontFamily: fontStack, pointerEvents: "auto" }}
    >
      <div className="absolute inset-0 bg-black" />

      <div
        ref={textRef}
        className="relative z-10 text-center px-6 splash-tagline-reveal"
        style={{ fontFamily: fontStack }}
      >
        <div
          className="font-sans text-[2rem] sm:text-[2.5rem] md:text-[3rem] lg:text-[3.5rem] font-light tracking-tight leading-none text-white"
          style={{ fontFamily: fontStack }}
        >
          {"Silver King by CAI".split("").map((char, index) => (
            <span
              key={index}
              className="letter inline-block"
              style={{
                display: char === " " ? "inline" : "inline-block",
                minWidth: char === " " ? "0.5em" : "auto",
              }}
            >
              {char === " " ? "\u00A0" : char}
            </span>
          ))}
        </div>

        <p className="splash-tagline mt-6 font-sans text-[0.75rem] md:text-[0.875rem] font-light tracking-[0.3em] text-white/85">
          {t("tagline")}
        </p>

        <div className="splash-line mt-8 mx-auto w-32 md:w-40 h-[1px] bg-gradient-to-r from-transparent via-white/30 to-transparent" />
      </div>
    </div>
  );
}
