"use client";

import { useLayoutEffect, useRef } from "react";
import { motion } from "framer-motion";
import { gsap } from "gsap";

interface SplashScreenProps {
  onComplete: () => void;
}

export default function SplashScreen({ onComplete }: SplashScreenProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLDivElement>(null);

  // USE useLayoutEffect for INSTANT initial state (no flash, no delay)
  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      const tl = gsap.timeline();

      // Get all letters
      const letters = textRef.current?.querySelectorAll(".letter");

      if (letters) {
        // Initial state - all hidden and blurred (SET IMMEDIATELY)
        gsap.set(letters, {
          opacity: 0,
          y: 30,
          filter: "blur(15px)",
          scale: 0.9,
        });

        // Animate letters one by one - FASTER & SMOOTHER
        tl.to(
          letters,
          {
            opacity: 1,
            y: 0,
            filter: "blur(0px)",
            scale: 1,
            duration: 0.7,
            stagger: {
              amount: 1.6, // Reduced from 2 for faster stagger
              ease: "power2.inOut",
            },
            ease: "expo.out",
          },
          0.1 // Start almost immediately (reduced from 0.3)
        );

        // Pulse effect at the end - SUBTLER & FASTER
        tl.to(
          textRef.current,
          {
            scale: 1.015, // More subtle (was 1.02)
            duration: 0.3,
            ease: "power2.out",
          },
          "-=0.4"
        );

        tl.to(
          textRef.current,
          {
            scale: 1,
            duration: 0.3,
            ease: "power2.inOut",
          },
          "-=0.15"
        );

        // Shorter hold
        tl.to({}, { duration: 0.3 });

        // Fade out entire splash - FASTER & SMOOTHER
        tl.to(
          containerRef.current,
          {
            opacity: 0,
            duration: 0.6, // Faster fade (was 0.8)
            ease: "power3.inOut",
            onComplete: () => {
              // Call parent's onComplete after fade out
              onComplete();
            },
          },
          "+=0.2" // Shorter delay before fade (was 0.3)
        );
      }
    });

    return () => ctx.revert();
  }, [onComplete]);

  return (
    <motion.div
      ref={containerRef}
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black"
    >
      {/* Subtle gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-black via-black to-gray-900/50" />

      {/* Main text */}
      <div
        ref={textRef}
        className="relative z-10 text-center px-6"
        style={{ perspective: "1000px" }}
      >
        <div className="font-sans text-[2rem] sm:text-[2.5rem] md:text-[3rem] lg:text-[3.5rem] font-light tracking-tight leading-none text-white">
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
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 0.4, y: 0 }}
          transition={{ duration: 1, delay: 2.5 }}
          className="mt-6 font-sans text-[0.75rem] md:text-[0.875rem] font-light tracking-[0.3em] via-whitewhite/40"
        >
          Precious Metals Excellence
        </motion.div>
      </div>

      {/* Decorative elements */}
      <motion.div
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ duration: 1.5, delay: 1, ease: "easeInOut" }}
        className="absolute bottom-20 left-1/2 -translate-x-1/2 w-32 h-[1px] bg-gradient-to-r from-transparent via-white/20 to-transparent"
      />
    </motion.div>
  );
}
