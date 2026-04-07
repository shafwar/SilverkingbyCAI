"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useNavigationTransition } from "./NavigationTransitionProvider";
import NProgress from "nprogress";
import "@/styles/nprogress.css";
import {
  isMobileDevice,
  prefersReducedMotion,
  getBlurIntensity,
  isLowPerformanceDevice,
} from "@/utils/device";

/**
 * Clears inline styles left by older transition logic. Never set body filter to blur(0px) —
 * that still creates a containing block and breaks position:fixed modals portaled to body.
 */
function clearPageTransitionStyles() {
  if (typeof document === "undefined" || !document.body) return;
  const bodyProps = ["filter", "opacity", "overflow", "will-change", "transition"] as const;
  const b = document.body;
  for (const p of bodyProps) {
    try {
      b.style.removeProperty(p);
    } catch {
      /* ignore */
    }
  }

  const hero = document.querySelector(".hero-section-transition") as HTMLElement | null;
  if (hero) {
    for (const p of ["filter", "opacity", "will-change", "transition"] as const) {
      try {
        hero.style.removeProperty(p);
      } catch {
        /* ignore */
      }
    }
  }

  const main = document.querySelector("main") as HTMLElement | null;
  if (main) {
    for (const p of ["filter", "opacity", "will-change", "transition"] as const) {
      try {
        main.style.removeProperty(p);
      } catch {
        /* ignore */
      }
    }
  }

  document.querySelectorAll("section, article").forEach((node) => {
    const el = node as HTMLElement;
    const f = el.style.filter;
    if (f && f.includes("blur")) {
      try {
        el.style.removeProperty("filter");
        el.style.removeProperty("will-change");
        el.style.removeProperty("transition");
      } catch {
        /* ignore */
      }
    }
  });
}

/**
 * Route transition: NProgress + full-screen overlay with backdrop-filter only.
 * Does NOT set filter/opacity on document.body (breaks fixed modals — see docs/CMS_MODAL_VIEWPORT_POSITIONING.md).
 */
export function PageTransitionOverlay() {
  const { isActive } = useNavigationTransition();
  const [isMounted, setIsMounted] = useState(false);
  const [isSplashComplete, setIsSplashComplete] = useState(false);
  const [deviceInfo, setDeviceInfo] = useState({
    isMobile: false,
    prefersReducedMotion: false,
    isLowPerformance: false,
  });

  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const blurRemovalTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    setIsMounted(true);

    if (typeof window !== "undefined") {
      setDeviceInfo({
        isMobile: isMobileDevice(),
        prefersReducedMotion: prefersReducedMotion(),
        isLowPerformance: isLowPerformanceDevice(),
      });

      const checkSplashComplete = () => {
        try {
          const splashShown = sessionStorage.getItem("splashShown");
          const bodyHasClass = document.body.classList.contains("splash-complete");
          const splashScreenExists = document.querySelector("[data-splash-screen]");
          const isComplete = splashShown === "true" || bodyHasClass || !splashScreenExists;
          setIsSplashComplete(isComplete);
        } catch {
          setIsSplashComplete(true);
        }
      };

      checkSplashComplete();

      const observer = new MutationObserver(() => {
        checkSplashComplete();
      });

      observer.observe(document.body, {
        attributes: true,
        attributeFilter: ["class"],
      });

      const checkInterval = setInterval(() => {
        checkSplashComplete();
      }, 100);

      return () => {
        observer.disconnect();
        clearInterval(checkInterval);
      };
    }
  }, []);

  /** Fix stuck styles after refresh / HMR / legacy bugs */
  useEffect(() => {
    if (isMounted) clearPageTransitionStyles();
  }, [isMounted]);

  const transitionSettings = useMemo(() => {
    const baseDuration = 0.5;
    const baseBlur = 14;

    if (deviceInfo.prefersReducedMotion) {
      return {
        duration: 0,
        blur: 0,
        progressSpeed: 150,
      };
    }

    if (deviceInfo.isMobile || deviceInfo.isLowPerformance) {
      return {
        duration: 0.45,
        blur: getBlurIntensity(baseBlur),
        progressSpeed: 280,
      };
    }

    return {
      duration: baseDuration,
      blur: baseBlur,
      progressSpeed: 400,
    };
  }, [deviceInfo]);

  useEffect(() => {
    if (!isMounted || typeof window === "undefined") return;

    if (!isSplashComplete) {
      try {
        NProgress.done();
      } catch {
        /* ignore */
      }
      return;
    }

    if (isActive) {
      if (document.body?.getAttribute("data-cms-modal-open") === "true") return;

      try {
        NProgress.configure({
          showSpinner: false,
          trickleSpeed: deviceInfo.isMobile ? 60 : 100,
          minimum: deviceInfo.isMobile ? 0.12 : 0.08,
          easing: "ease-out",
          speed: transitionSettings.progressSpeed,
        });

        NProgress.start();

        requestAnimationFrame(() => {
          try {
            NProgress.set(0.15);

            if (progressIntervalRef.current) {
              clearInterval(progressIntervalRef.current);
            }

            progressIntervalRef.current = setInterval(() => {
              try {
                const currentProgress = (NProgress as { status?: number }).status || 0;
                if (currentProgress < 0.9) {
                  NProgress.inc(0.05);
                } else if (progressIntervalRef.current) {
                  clearInterval(progressIntervalRef.current);
                  progressIntervalRef.current = null;
                }
              } catch {
                if (progressIntervalRef.current) {
                  clearInterval(progressIntervalRef.current);
                  progressIntervalRef.current = null;
                }
              }
            }, 100);
          } catch {
            /* ignore */
          }
        });
      } catch {
        /* ignore */
      }
    } else {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
        progressIntervalRef.current = null;
      }

      try {
        NProgress.set(1.0);
        setTimeout(() => {
          NProgress.done();
        }, 100);
      } catch {
        /* ignore */
      }
    }

    return () => {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
        progressIntervalRef.current = null;
      }
      if (blurRemovalTimeoutRef.current) {
        clearTimeout(blurRemovalTimeoutRef.current);
        blurRemovalTimeoutRef.current = null;
      }
    };
  }, [
    isActive,
    deviceInfo.isMobile,
    transitionSettings.progressSpeed,
    isMounted,
    isSplashComplete,
  ]);

  /** Safety: clear any stuck inline styles; on navigation end strip legacy body blur */
  useEffect(() => {
    if (!isMounted || typeof window === "undefined") return;

    if (blurRemovalTimeoutRef.current) {
      clearTimeout(blurRemovalTimeoutRef.current);
      blurRemovalTimeoutRef.current = null;
    }

    if (isActive) {
      blurRemovalTimeoutRef.current = setTimeout(() => {
        console.warn("[PageTransition] Safety timeout — clearing stuck transition styles");
        clearPageTransitionStyles();
      }, 3000);
    } else {
      requestAnimationFrame(() => clearPageTransitionStyles());
    }

    return () => {
      if (blurRemovalTimeoutRef.current) {
        clearTimeout(blurRemovalTimeoutRef.current);
        blurRemovalTimeoutRef.current = null;
      }
    };
  }, [isActive, isMounted]);

  useEffect(() => {
    return () => {
      clearPageTransitionStyles();
    };
  }, []);

  if (!isMounted) {
    return null;
  }

  const easingFunction = "easeInOut";
  const showBackdropOverlay =
    isActive &&
    isSplashComplete &&
    !deviceInfo.prefersReducedMotion &&
    transitionSettings.blur > 0;

  return (
    <AnimatePresence mode="wait">
      {showBackdropOverlay && (
        <motion.div
          key="transition-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{
            duration: transitionSettings.duration,
            ease: easingFunction,
          }}
          className="fixed inset-0 z-[9999] pointer-events-none"
          style={{
            background: "rgba(0, 0, 0, 0.08)",
            backdropFilter: `blur(${transitionSettings.blur}px)`,
            WebkitBackdropFilter: `blur(${transitionSettings.blur}px)`,
            transform: "translateZ(0)",
            backfaceVisibility: "hidden",
            WebkitBackfaceVisibility: "hidden",
          }}
        />
      )}
    </AnimatePresence>
  );
}
