"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import Image from "next/image";
import { useNavigationTransition } from "./NavigationTransitionProvider";
import { Variants } from "framer-motion";
import { getR2UrlClient } from "@/utils/r2-url";

const panelVariants: Variants = {
  enter: { y: "100%" },
  active: {
    y: "0%",
    transition: { duration: 0.4, ease: [0.22, 0.61, 0.36, 1] }, // Faster: 0.75 -> 0.4
  },
  exit: {
    y: "-100%",
    transition: { duration: 0.4, ease: [0.22, 0.61, 0.36, 1] }, // Faster: 0.95 -> 0.4
  },
};

export function PageTransitionOverlay() {
  const { isActive } = useNavigationTransition();
  const [renderOverlay, setRenderOverlay] = useState(false);

  useEffect(() => {
    if (isActive) {
      setRenderOverlay(true);
      return;
    }
    // CRITICAL: Reduced delay for faster overlay removal
    // Faster: 1100ms -> 500ms to match faster exit animation
    const timer = setTimeout(() => setRenderOverlay(false), 500);
    return () => clearTimeout(timer);
  }, [isActive]);

  return (
    <AnimatePresence>
      {renderOverlay && (
        <motion.div
          key="global-overlay"
          className="pointer-events-none fixed inset-0 z-[999] flex items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <motion.div className="absolute inset-0 bg-black" initial={{ opacity: 0 }} animate={{ opacity: 1 }} />
          <motion.div
            className="absolute inset-0 bg-black"
            variants={panelVariants}
            initial="enter"
            animate={isActive ? "active" : "exit"}
          />
          <motion.div
            className="relative h-16 w-16"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.4, ease: [0.18, 0.82, 0.22, 1], delay: 0.1 }} // Faster: 0.6 -> 0.4, delay 0.15 -> 0.1
          >
            <motion.div
              className="absolute inset-0 rounded-full bg-white/20 blur-2xl"
              animate={{ opacity: [0.15, 0.4, 0.15], scale: [1, 1.15, 1] }}
              transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
            />
            <motion.div
              className="absolute inset-0 rounded-full border border-white/30"
              animate={{ opacity: [0.3, 0.7, 0.3], scale: [0.95, 1.05, 0.95] }}
              transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
            />
            <motion.div
              className="relative h-full w-full"
              animate={{
                filter: [
                  "brightness(1.1) drop-shadow(0 0 10px rgba(255,255,255,0.25))",
                  "brightness(2.6) drop-shadow(0 0 25px rgba(255,255,255,0.55))",
                  "brightness(1.1) drop-shadow(0 0 10px rgba(255,255,255,0.25))",
                ],
              }}
              transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
            >
              <Image
                src={getR2UrlClient("/images/cai-logo.png")}
                alt="CAI Emblem"
                fill
                sizes="(max-width: 768px) 200px, 300px"
                className="object-contain"
                style={{ filter: "invert(1) saturate(0)" }}
                priority
              />
            </motion.div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}


