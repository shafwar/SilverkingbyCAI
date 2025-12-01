"use client";

import { useEffect, useState, useMemo } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useNavigationTransition } from "./NavigationTransitionProvider";
import NProgress from "nprogress";
import "@/styles/nprogress.css";
import {
  isMobileDevice,
  prefersReducedMotion,
  getTransitionDuration,
  getBlurIntensity,
  isLowPerformanceDevice,
} from "@/utils/device";

/**
 * Page Transition Overlay dengan Blur + Fade Effect
 * Mirip dengan antikode.com - smooth blur out pada halaman yang keluar
 * Optimized untuk mobile dan reduced motion preferences
 * PRODUCTION-SAFE: Enhanced with proper client-side checks and DOM readiness
 */
export function PageTransitionOverlay() {
  const { isActive } = useNavigationTransition();
  const [isBlurring, setIsBlurring] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [deviceInfo, setDeviceInfo] = useState({
    isMobile: false,
    prefersReducedMotion: false,
    isLowPerformance: false,
  });

  // CRITICAL: Ensure component only runs on client (production-safe)
  useEffect(() => {
    setIsMounted(true);

    // Detect device capabilities once on mount (only on client)
    if (typeof window !== "undefined") {
      setDeviceInfo({
        isMobile: isMobileDevice(),
        prefersReducedMotion: prefersReducedMotion(),
        isLowPerformance: isLowPerformanceDevice(),
      });
    }
  }, []);

  // ENHANCED transition settings - visible blur effect with smooth animation
  const transitionSettings = useMemo(() => {
    // Longer durations for visible and smooth blur transitions
    const baseDuration = 0.4; // 400ms for smooth visible blur
    const baseBlur = 8; // Increased blur intensity for better visibility

    if (deviceInfo.prefersReducedMotion) {
      return {
        duration: 0,
        blur: 0,
        progressSpeed: 150, // Very fast for reduced motion
      };
    }

    if (deviceInfo.isMobile || deviceInfo.isLowPerformance) {
      return {
        duration: 0.35, // 350ms on mobile for visible blur
        blur: getBlurIntensity(baseBlur), // ~4px on mobile
        progressSpeed: 200, // Faster progress on mobile
      };
    }

    return {
      duration: baseDuration, // 400ms on desktop for smooth blur
      blur: baseBlur, // 8px blur on desktop
      progressSpeed: 300, // Progress speed on desktop
    };
  }, [deviceInfo]);

  useEffect(() => {
    // PRODUCTION-SAFE: Only run when mounted and window is available
    if (!isMounted || typeof window === "undefined") return;

    if (isActive) {
      // Start blur effect on current page
      setIsBlurring(true);

      // PRODUCTION-SAFE: Initialize NProgress with error handling
      try {
        // Start NProgress with optimized settings
        NProgress.start();

        // Configure NProgress untuk ULTRA FAST animation dengan optimasi mobile
        NProgress.configure({
          showSpinner: false,
          trickleSpeed: deviceInfo.isMobile ? 100 : 150, // Much faster trickle
          minimum: deviceInfo.isMobile ? 0.05 : 0.03, // Lower minimum for faster start
          easing: "ease-out",
          speed: transitionSettings.progressSpeed,
        });
      } catch (error) {
        console.error("[PageTransition] Error initializing NProgress:", error);
        // Continue without NProgress if it fails
      }
    } else {
      // Remove blur when transition completes
      setIsBlurring(false);

      // PRODUCTION-SAFE: Stop NProgress with error handling
      try {
        NProgress.done();
      } catch (error) {
        console.error("[PageTransition] Error stopping NProgress:", error);
      }
    }
  }, [isActive, deviceInfo.isMobile, transitionSettings.progressSpeed, isMounted]);

  // Apply blur to body when transitioning dengan optimasi mobile
  // ALWAYS ensure HeroSection gets blur effect during transition
  // PRODUCTION-SAFE: Enhanced with robust DOM readiness checks and retry mechanism
  useEffect(() => {
    // CRITICAL: Only run on client and when mounted
    if (typeof window === "undefined" || !isMounted) return;

    if (isBlurring && transitionSettings.blur > 0) {
      // PRODUCTION-SAFE: Enhanced DOM readiness check with multiple retry attempts
      if (!document.body) {
        let retryCount = 0;
        const maxRetries = 10;
        const retryInterval = setInterval(() => {
          retryCount++;
          if (document.body && isBlurring) {
            clearInterval(retryInterval);
            // Use requestAnimationFrame to ensure DOM is fully ready
            requestAnimationFrame(() => {
              applyBlurEffects();
            });
          } else if (retryCount >= maxRetries) {
            clearInterval(retryInterval);
            console.warn("[PageTransition] Document.body not ready after retries");
          }
        }, 10);
        return () => clearInterval(retryInterval);
      }

      const applyBlurEffects = () => {
        // PRODUCTION-SAFE: Double-check body exists before applying styles
        if (!document.body) {
          console.warn("[PageTransition] Document.body not available, skipping blur");
          return;
        }

        try {
          // Use will-change untuk better performance
          document.body.style.willChange = "filter, opacity";
          // Apply blur with smooth transition
          document.body.style.filter = `blur(${transitionSettings.blur}px)`;
          document.body.style.transition = `filter ${transitionSettings.duration}s cubic-bezier(0.4, 0, 0.2, 1), opacity ${transitionSettings.duration}s cubic-bezier(0.4, 0, 0.2, 1)`;
          document.body.style.overflow = "hidden";
          // Slight opacity reduction for more dramatic effect
          document.body.style.opacity = "0.95";
        } catch (error) {
          console.error("[PageTransition] Error applying body blur:", error);
        }

        // ALWAYS apply blur to hero section for consistent transition effect
        // PRODUCTION-SAFE: Enhanced with robust retry mechanism and DOM checks
        const applyHeroBlur = (attempt = 0) => {
          const maxAttempts = 5;

          requestAnimationFrame(() => {
            requestAnimationFrame(() => {
              // PRODUCTION-SAFE: Enhanced DOM checks
              if (typeof document === "undefined" || !document.body) {
                if (attempt < maxAttempts) {
                  setTimeout(() => applyHeroBlur(attempt + 1), 20);
                }
                return;
              }

              const heroSection = document.querySelector(".hero-section-transition");
              if (heroSection) {
                try {
                  const heroEl = heroSection as HTMLElement;
                  // Apply blur transition to hero section with enhanced visibility
                  heroEl.style.transition = `filter ${transitionSettings.duration}s cubic-bezier(0.4, 0, 0.2, 1), opacity ${transitionSettings.duration}s cubic-bezier(0.4, 0, 0.2, 1)`;
                  heroEl.style.willChange = "filter, opacity";
                  // CRITICAL: Ensure hero section gets blurred AND stays visible
                  // Use slightly higher blur for hero section to make it more dramatic
                  const heroBlur = transitionSettings.blur * 1.2; // 20% more blur for hero
                  heroEl.style.filter = `blur(${heroBlur}px)`;
                  heroEl.style.opacity = "0.98"; // Slight opacity reduction for effect
                  console.log("[PageTransition] Hero section blur applied:", { blur: heroBlur });
                } catch (error) {
                  console.error("[PageTransition] Error applying hero blur:", error);
                }
              } else if (attempt < maxAttempts && isBlurring) {
                // Retry if hero section not found yet
                setTimeout(() => applyHeroBlur(attempt + 1), 50);
              }
            });
          });
        };

        // Apply hero blur with retry mechanism for production
        applyHeroBlur();
      };

      // PRODUCTION-SAFE: Apply blur effects with error handling
      try {
        applyBlurEffects();
      } catch (error) {
        console.error("[PageTransition] Error in applyBlurEffects:", error);
      }

      // Remove will-change after transition untuk cleanup - faster cleanup
      setTimeout(
        () => {
          if (document.body) {
            try {
              document.body.style.willChange = "auto";
            } catch (error) {
              console.error("[PageTransition] Error cleaning up body willChange:", error);
            }
          }
          // Also cleanup hero section
          requestAnimationFrame(() => {
            if (typeof document !== "undefined") {
              const heroSection = document.querySelector(".hero-section-transition");
              if (heroSection) {
                try {
                  (heroSection as HTMLElement).style.willChange = "auto";
                } catch (error) {
                  console.error("[PageTransition] Error cleaning up hero willChange:", error);
                }
              }
            }
          });
        },
        transitionSettings.duration * 1000 + 50 // Reduced from 100ms to 50ms
      );
    } else if (!isBlurring) {
      // Remove blur INSTANTLY for faster transitions
      // PRODUCTION-SAFE: Enhanced with robust DOM checks and error handling
      const removeBlur = () => {
        if (typeof window === "undefined" || !document.body) {
          console.warn("[PageTransition] Window or document.body not available for blur removal");
          return;
        }

        try {
          document.body.style.filter = "blur(0px)";
          document.body.style.opacity = "1";
          document.body.style.overflow = "";
        } catch (error) {
          console.error("[PageTransition] Error removing body blur:", error);
        }

        // Also remove from hero section - ensure smooth removal
        // PRODUCTION-SAFE: Enhanced with retry mechanism
        const removeHeroBlur = (attempt = 0) => {
          requestAnimationFrame(() => {
            if (typeof document === "undefined" || !document.body) {
              if (attempt < 3) {
                setTimeout(() => removeHeroBlur(attempt + 1), 20);
              }
              return;
            }

            const heroSection = document.querySelector(".hero-section-transition");
            if (heroSection) {
              try {
                const heroEl = heroSection as HTMLElement;
                // Faster blur removal - reduced duration
                heroEl.style.transition = `filter ${transitionSettings.duration * 0.6}s cubic-bezier(0.4, 0, 0.2, 1), opacity ${transitionSettings.duration * 0.6}s cubic-bezier(0.4, 0, 0.2, 1)`;
                heroEl.style.filter = "blur(0px)";
                heroEl.style.opacity = "1";
              } catch (error) {
                console.error("[PageTransition] Error removing hero blur:", error);
              }
            } else if (attempt < 3) {
              // Retry if hero section not found
              setTimeout(() => removeHeroBlur(attempt + 1), 50);
            }
          });
        };

        removeHeroBlur();

        // Faster cleanup - reduced delays
        setTimeout(() => {
          if (document.body) {
            try {
              document.body.style.willChange = "auto";
            } catch (error) {
              console.error("[PageTransition] Error cleaning up body willChange:", error);
            }
          }
          requestAnimationFrame(() => {
            if (typeof document !== "undefined") {
              const heroSection = document.querySelector(".hero-section-transition");
              if (heroSection) {
                try {
                  const heroEl = heroSection as HTMLElement;
                  heroEl.style.willChange = "auto";
                  // Remove transition after animation completes - faster cleanup
                  setTimeout(() => {
                    try {
                      heroEl.style.transition = "";
                    } catch (error) {
                      console.error("[PageTransition] Error removing hero transition:", error);
                    }
                  }, transitionSettings.duration * 600); // Reduced from 800ms
                } catch (error) {
                  console.error("[PageTransition] Error cleaning up hero styles:", error);
                }
              }
            }
          });
        }, 50); // Reduced from 100ms to 50ms
      };

      // Instant removal for faster transitions
      if (transitionSettings.duration > 0) {
        setTimeout(removeBlur, 0); // Changed from 50ms to 0ms for instant removal
      } else {
        removeBlur();
      }
    }

    return () => {
      // Cleanup - PRODUCTION-SAFE: Check for window and document
      if (typeof window === "undefined" || !document.body) return;

      document.body.style.filter = "";
      document.body.style.opacity = "";
      document.body.style.overflow = "";
      document.body.style.willChange = "auto";

      if (typeof document !== "undefined") {
        const heroSection = document.querySelector(".hero-section-transition");
        if (heroSection) {
          (heroSection as HTMLElement).style.filter = "";
          (heroSection as HTMLElement).style.willChange = "auto";
        }
      }
    };
  }, [isBlurring, transitionSettings, isMounted]);

  // CRITICAL: Don't render until mounted (prevents hydration mismatch)
  // NOTE: NProgress and blur effects run in useEffect above, so they work even if we return null here
  if (!isMounted) {
    return null;
  }

  // Optimized easing function untuk smoother animation
  const easingFunction = "easeInOut";

  // Render overlay (blur and NProgress already running via useEffect above)
  // Only skip visual overlay if reduced motion, but keep blur and NProgress active
  return (
    <AnimatePresence mode="wait">
      {isActive && !deviceInfo.prefersReducedMotion && (
        <motion.div
          key="transition-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{
            duration: transitionSettings.duration,
            ease: easingFunction,
          }}
          className="fixed inset-0 z-[9999] pointer-events-none will-change-opacity"
          style={{
            background: "rgba(0, 0, 0, 0.02)",
            // Use transform for GPU acceleration
            transform: "translateZ(0)",
            // Backface visibility untuk smooth rendering
            backfaceVisibility: "hidden",
            WebkitBackfaceVisibility: "hidden",
          }}
        />
      )}
    </AnimatePresence>
  );
}
