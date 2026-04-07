"use client";

import { useEffect, useState, useMemo, useRef } from "react";
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
 * Strip blur/filter from body, main, and sections. Never leave `filter: blur(0px)` —
 * any non-`none` filter on an ancestor breaks `position: fixed` (viewport-relative)
 * for descendants, causing hero videos and portaled admin controls to scroll with the page.
 */
function clearPageTransitionBlurStyles(): void {
  if (typeof document === "undefined" || !document.body) return;
  const body = document.body;
  body.style.removeProperty("filter");
  body.style.removeProperty("opacity");
  body.style.removeProperty("transition");
  body.style.overflow = "";
  body.style.willChange = "auto";

  const heroSection = document.querySelector(".hero-section-transition");
  if (heroSection) {
    const el = heroSection as HTMLElement;
    el.style.removeProperty("filter");
    el.style.removeProperty("opacity");
    el.style.removeProperty("transition");
    el.style.willChange = "auto";
  }
  const mainContent = document.querySelector("main");
  if (mainContent) {
    const el = mainContent as HTMLElement;
    el.style.removeProperty("filter");
    el.style.removeProperty("opacity");
    el.style.removeProperty("transition");
    el.style.willChange = "auto";
  }
  document.querySelectorAll("section, article").forEach((node) => {
    const el = node as HTMLElement;
    el.style.removeProperty("filter");
    el.style.removeProperty("transition");
    el.style.willChange = "auto";
  });
}

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
  const [isSplashComplete, setIsSplashComplete] = useState(false);
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

      // Check if splash screen is already complete
      const checkSplashComplete = () => {
        try {
          const splashShown = sessionStorage.getItem("splashShown");
          const bodyHasClass = document.body.classList.contains("splash-complete");
          const splashScreenExists = document.querySelector("[data-splash-screen]");

          // Splash is complete if:
          // 1. sessionStorage says it's shown, OR
          // 2. body has splash-complete class, OR
          // 3. No splash screen element exists (already removed)
          const isComplete = splashShown === "true" || bodyHasClass || !splashScreenExists;

          if (isComplete !== isSplashComplete) {
            setIsSplashComplete(isComplete);
          }
        } catch (error) {
          // If sessionStorage fails, assume splash is complete
          setIsSplashComplete(true);
        }
      };

      // Initial check
      checkSplashComplete();

      // Watch for splash completion via body class change
      const observer = new MutationObserver(() => {
        checkSplashComplete();
      });

      observer.observe(document.body, {
        attributes: true,
        attributeFilter: ["class"],
      });

      // Also check periodically (fallback)
      const checkInterval = setInterval(() => {
        checkSplashComplete();
      }, 100);

      // Cleanup
      return () => {
        observer.disconnect();
        clearInterval(checkInterval);
      };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // isSplashComplete is checked via MutationObserver, no need to add as dependency

  // ENHANCED transition settings - DEEP blur effect with smooth animation
  // OPTIMIZED for all pages and mobile devices
  const transitionSettings = useMemo(() => {
    // Longer durations for visible and smooth blur transitions
    const baseDuration = 0.5; // 500ms for smooth visible blur (increased for better visibility)
    const baseBlur = 14; // DEEP blur intensity for better visibility (10px → 14px)

    if (deviceInfo.prefersReducedMotion) {
      return {
        duration: 0,
        blur: 0,
        progressSpeed: 150, // Very fast for reduced motion
      };
    }

    if (deviceInfo.isMobile || deviceInfo.isLowPerformance) {
      return {
        duration: 0.45, // 450ms on mobile for visible blur (increased from 400ms)
        blur: getBlurIntensity(baseBlur), // ~7px on mobile (increased from 5px)
        progressSpeed: 280, // Optimized progress on mobile
      };
    }

    return {
      duration: baseDuration, // 500ms on desktop for smooth blur
      blur: baseBlur, // 14px DEEP blur on desktop (increased from 10px)
      progressSpeed: 400, // Progress speed on desktop
    };
  }, [deviceInfo]);

  // Store progress interval ref for cleanup
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);
  // CRITICAL: Store blur removal timeout for safety fallback
  const blurRemovalTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // PRODUCTION-SAFE: Only run when mounted and window is available
    if (!isMounted || typeof window === "undefined") return;

    // CRITICAL: Don't show NProgress or blur during splash screen
    if (!isSplashComplete) {
      // Ensure NProgress is not visible during splash
      try {
        NProgress.done();
      } catch (error) {
        // Ignore
      }
      return;
    }

    if (isActive) {
      // Do not start blur when CMS replace-media modal is open (any page: Home, What We Do, Authenticity, Products, About, Distributor)
      if (document.body?.getAttribute("data-cms-modal-open") === "true") return;
      // Start blur effect on CURRENT page - ALWAYS for ALL pages
      setIsBlurring(true);

      // PRODUCTION-SAFE: Initialize NProgress with error handling
      // ENHANCED: Always show NProgress for ALL navigations
      try {
        // Configure NProgress FIRST before starting (ensures proper settings)
        NProgress.configure({
          showSpinner: false,
          trickleSpeed: deviceInfo.isMobile ? 60 : 100, // Faster trickle for better visibility
          minimum: deviceInfo.isMobile ? 0.12 : 0.08, // Higher minimum for better visibility
          easing: "ease-out",
          speed: transitionSettings.progressSpeed,
        });

        // Start NProgress with optimized settings
        NProgress.start();

        // Force NProgress to be visible immediately with higher initial value
        // CRITICAL: NProgress shows during fetching of new page while CURRENT page is blurred
        requestAnimationFrame(() => {
          try {
            NProgress.set(0.15); // Higher initial progress for immediate visibility
            console.log(
              "[PageTransition] NProgress started - fetching new page while CURRENT page is blurred"
            );

            // Clear any existing interval
            if (progressIntervalRef.current) {
              clearInterval(progressIntervalRef.current);
            }

            // Continue trickling for smooth progress during fetching
            // This ensures progress bar continues while Next.js fetches the new page
            progressIntervalRef.current = setInterval(() => {
              try {
                const currentProgress = (NProgress as any).status || 0;
                if (currentProgress < 0.9) {
                  // Increment progress slowly during fetching
                  NProgress.inc(0.05);
                } else {
                  if (progressIntervalRef.current) {
                    clearInterval(progressIntervalRef.current);
                    progressIntervalRef.current = null;
                  }
                }
              } catch (e) {
                if (progressIntervalRef.current) {
                  clearInterval(progressIntervalRef.current);
                  progressIntervalRef.current = null;
                }
              }
            }, 100); // Update every 100ms during fetching
          } catch (e) {
            // Ignore if already started
          }
        });
      } catch (error) {
        console.error("[PageTransition] Error initializing NProgress:", error);
        // Continue without NProgress if it fails
      }
    } else {
      // Remove blur when transition completes - NEW page is now loaded
      setIsBlurring(false);

      // Cleanup progress interval
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
        progressIntervalRef.current = null;
      }

      // PRODUCTION-SAFE: Stop NProgress with error handling
      // ENHANCED: Ensure NProgress completes smoothly when NEW page is ready
      try {
        // Set to 100% before done() for smooth completion
        NProgress.set(1.0);
        console.log(
          "[PageTransition] Navigation complete - NEW page loaded, removing blur from OLD page"
        );
        // Small delay to ensure progress bar is visible at 100%
        setTimeout(() => {
          NProgress.done();
        }, 100);
      } catch (error) {
        console.error("[PageTransition] Error stopping NProgress:", error);
      }
    }

    // Cleanup on unmount
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

  // CRITICAL: Safety fallback - ensure blur is ALWAYS removed after maximum time
  // This prevents stuck blur if pathname detection fails
  useEffect(() => {
    if (!isMounted || typeof window === "undefined") return;

    // Clear any existing safety timeout
    if (blurRemovalTimeoutRef.current) {
      clearTimeout(blurRemovalTimeoutRef.current);
      blurRemovalTimeoutRef.current = null;
    }

    if (isActive) {
      // Set safety timeout: force remove blur after 3 seconds maximum
      blurRemovalTimeoutRef.current = setTimeout(() => {
        console.warn("[PageTransition] Safety timeout - forcing blur removal after 3s");
        setIsBlurring(false);

        clearPageTransitionBlurStyles();
      }, 3000); // 3 second safety timeout
    } else {
      // CLEAN: When isActive becomes false, ensure blur is removed smoothly
      setIsBlurring(false);

      // Clear safety timeout when not active
      if (blurRemovalTimeoutRef.current) {
        clearTimeout(blurRemovalTimeoutRef.current);
        blurRemovalTimeoutRef.current = null;
      }

      requestAnimationFrame(() => clearPageTransitionBlurStyles());
    }

    return () => {
      if (blurRemovalTimeoutRef.current) {
        clearTimeout(blurRemovalTimeoutRef.current);
        blurRemovalTimeoutRef.current = null;
      }
    };
  }, [isActive, isMounted, transitionSettings.duration]);

  // Apply blur to body when transitioning dengan optimasi mobile
  // ALWAYS ensure HeroSection gets blur effect during transition
  // PRODUCTION-SAFE: Enhanced with robust DOM readiness checks and retry mechanism
  useEffect(() => {
    // CRITICAL: Only run on client and when mounted
    if (typeof window === "undefined" || !isMounted) return;

    if (isBlurring && transitionSettings.blur > 0) {
      // Do not blur when CMS replace-media modal is open on any page (avoids conflict and freeze)
      if (document.body?.getAttribute("data-cms-modal-open") === "true") return;

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
          // Do NOT set filter/opacity on document.body: non-none `filter` makes body the
          // containing block for all position:fixed descendants → hero video + HeroEditPortal scroll incorrectly.
          document.body.style.overflow = "hidden";
          console.log("[PageTransition] Scroll locked on body (no body filter — fixed layers stay viewport-locked):", {
            blur: transitionSettings.blur,
            page: window.location.pathname,
          });
        } catch (error) {
          console.error("[PageTransition] Error applying body scroll lock:", error);
        }

        // ENHANCED: Apply blur to ALL page sections, not just hero
        // This ensures consistent blur effect across ALL pages
        const applyPageBlur = (attempt = 0) => {
          const maxAttempts = 5;

          requestAnimationFrame(() => {
            requestAnimationFrame(() => {
              // PRODUCTION-SAFE: Enhanced DOM checks
              if (typeof document === "undefined" || !document.body) {
                if (attempt < maxAttempts) {
                  setTimeout(() => applyPageBlur(attempt + 1), 20);
                }
                return;
              }

              // Apply blur to hero section if it exists (home page)
              // CRITICAL: Blur CURRENT page's hero section
              const heroSection = document.querySelector(".hero-section-transition");
              if (heroSection) {
                try {
                  const heroEl = heroSection as HTMLElement;
                  heroEl.style.willChange = "filter, opacity";
                  // CRITICAL: Apply blur IMMEDIATELY to CURRENT page's hero section
                  // Use DEEP blur for hero section - more dramatic effect
                  const heroBlur = transitionSettings.blur * 1.2; // 20% more blur for hero (14px * 1.2 = ~17px)
                  // Apply blur SYNCHRONOUSLY - no delay
                  heroEl.style.filter = `blur(${heroBlur}px)`;
                  heroEl.style.opacity = "0.94"; // Slight opacity reduction for effect
                  console.log("[PageTransition] Hero section blur applied to CURRENT page:", {
                    blur: heroBlur,
                    page: window.location.pathname,
                  });

                  // Then add smooth transition
                  requestAnimationFrame(() => {
                    if (heroEl) {
                      heroEl.style.transition = `filter ${transitionSettings.duration}s cubic-bezier(0.4, 0, 0.2, 1), opacity ${transitionSettings.duration}s cubic-bezier(0.4, 0, 0.2, 1)`;
                    }
                  });
                } catch (error) {
                  console.error("[PageTransition] Error applying hero blur:", error);
                }
              }

              // ENHANCED: Apply DEEP blur to main content sections for ALL pages
              // CRITICAL: Blur CURRENT page's main content (products, about, etc.)
              const mainContent = document.querySelector("main");
              if (mainContent) {
                try {
                  const mainEl = mainContent as HTMLElement;
                  mainEl.style.willChange = "filter, opacity";
                  // CRITICAL: Apply blur IMMEDIATELY to CURRENT page's main content
                  // No transition delay - immediate blur on source page
                  mainEl.style.filter = `blur(${transitionSettings.blur}px)`;
                  mainEl.style.opacity = "0.93";
                  console.log("[PageTransition] Main content blur applied to CURRENT page:", {
                    blur: transitionSettings.blur,
                    page: window.location.pathname,
                  });

                  // Then add smooth transition
                  requestAnimationFrame(() => {
                    if (mainEl) {
                      mainEl.style.transition = `filter ${transitionSettings.duration}s cubic-bezier(0.4, 0, 0.2, 1), opacity ${transitionSettings.duration}s cubic-bezier(0.4, 0, 0.2, 1)`;
                    }
                  });
                } catch (error) {
                  console.error("[PageTransition] Error applying main content blur:", error);
                }
              }

              // Also apply DEEP blur to article/section elements for better coverage
              // CRITICAL: Blur CURRENT page's sections
              const sections = document.querySelectorAll("section, article");
              sections.forEach((section) => {
                try {
                  const sectionEl = section as HTMLElement;
                  sectionEl.style.willChange = "filter";
                  // CRITICAL: Apply blur IMMEDIATELY to CURRENT page's sections
                  // No transition delay - immediate blur
                  sectionEl.style.filter = `blur(${transitionSettings.blur * 0.9}px)`; // Slightly less blur for sections

                  // Then add smooth transition
                  requestAnimationFrame(() => {
                    if (sectionEl) {
                      sectionEl.style.transition = `filter ${transitionSettings.duration}s cubic-bezier(0.4, 0, 0.2, 1)`;
                    }
                  });
                } catch (error) {
                  // Ignore errors for individual sections
                }
              });

              if (attempt < maxAttempts && isBlurring && !heroSection && !mainContent) {
                // Retry if no sections found yet
                setTimeout(() => applyPageBlur(attempt + 1), 50);
              }
            });
          });
        };

        // Apply page blur with retry mechanism for production
        applyPageBlur();
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
          requestAnimationFrame(() => {
            if (typeof document === "undefined" || !document.body) return;
            try {
              document.body.style.willChange = "auto";
            } catch (error) {
              console.error("[PageTransition] Error cleaning up body willChange:", error);
            }
            const heroSection = document.querySelector(".hero-section-transition");
            if (heroSection) {
              try {
                (heroSection as HTMLElement).style.willChange = "auto";
              } catch (error) {
                console.error("[PageTransition] Error cleaning up hero willChange:", error);
              }
            }
          });
        },
        transitionSettings.duration * 1000 + 50 // Reduced from 100ms to 50ms
      );
    } else if (!isBlurring) {
      requestAnimationFrame(() => clearPageTransitionBlurStyles());
    }

    return () => {
      if (typeof window === "undefined" || !document.body) return;
      clearPageTransitionBlurStyles();
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
            background: "rgba(0, 0, 0, 0.06)",
            // Blur via backdrop-filter so we never need filter on body (which breaks position:fixed children).
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
