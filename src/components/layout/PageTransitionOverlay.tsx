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
 */
export function PageTransitionOverlay() {
  const { isActive } = useNavigationTransition();
  const [isBlurring, setIsBlurring] = useState(false);
  const [deviceInfo, setDeviceInfo] = useState({
    isMobile: false,
    prefersReducedMotion: false,
    isLowPerformance: false,
  });

  // Detect device capabilities once on mount
  useEffect(() => {
    setDeviceInfo({
      isMobile: isMobileDevice(),
      prefersReducedMotion: prefersReducedMotion(),
      isLowPerformance: isLowPerformanceDevice(),
    });
  }, []);

  // Optimized transition settings based on device - ULTRA FAST
  const transitionSettings = useMemo(() => {
    // Significantly reduced durations for faster transitions
    const baseDuration = 0.2; // Reduced from 0.4s to 0.2s (50% faster)
    const baseBlur = 6; // Slightly reduced blur for better performance

    if (deviceInfo.prefersReducedMotion) {
      return {
        duration: 0,
        blur: 0,
        progressSpeed: 150, // Very fast for reduced motion
      };
    }

    if (deviceInfo.isMobile || deviceInfo.isLowPerformance) {
      return {
        duration: 0.15, // Ultra fast on mobile (150ms)
        blur: getBlurIntensity(baseBlur),
        progressSpeed: 200, // Much faster progress on mobile
      };
    }

    return {
      duration: baseDuration, // 200ms on desktop
      blur: baseBlur,
      progressSpeed: 300, // Faster progress on desktop
    };
  }, [deviceInfo]);

  useEffect(() => {
    if (isActive) {
      // Start blur effect on current page
      setIsBlurring(true);

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
    } else {
      // Remove blur when transition completes
      setIsBlurring(false);
      NProgress.done();
    }
  }, [isActive, deviceInfo.isMobile, transitionSettings.progressSpeed]);

  // Apply blur to body when transitioning dengan optimasi mobile
  // ALWAYS ensure HeroSection gets blur effect during transition
  useEffect(() => {
    if (isBlurring && transitionSettings.blur > 0) {
      // Use will-change untuk better performance
      document.body.style.willChange = "filter";
      document.body.style.filter = `blur(${transitionSettings.blur}px)`;
      document.body.style.transition = `filter ${transitionSettings.duration}s cubic-bezier(0.4, 0, 0.2, 1)`;
      document.body.style.overflow = "hidden";

      // ALWAYS apply blur to hero section for consistent transition effect
      // Use multiple requestAnimationFrame to ensure DOM is ready and visible
      // CRITICAL: Apply blur immediately and keep it visible (opacity 1) like other pages
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          const heroSection = document.querySelector(".hero-section-transition");
          if (heroSection) {
            const heroEl = heroSection as HTMLElement;
            // Apply blur transition to hero section
            heroEl.style.transition = `filter ${transitionSettings.duration}s cubic-bezier(0.4, 0, 0.2, 1), opacity ${transitionSettings.duration}s cubic-bezier(0.4, 0, 0.2, 1)`;
            heroEl.style.willChange = "filter, opacity";
            // CRITICAL: Ensure hero section gets blurred AND stays visible (opacity 1)
            // This matches the behavior of other pages - visible but blurred
            heroEl.style.filter = `blur(${transitionSettings.blur}px)`;
            heroEl.style.opacity = "1"; // FORCE opacity to 1 to keep it visible with blur
          }
        });
      });

      // Remove will-change after transition untuk cleanup - faster cleanup
      setTimeout(
        () => {
          document.body.style.willChange = "auto";
          // Also cleanup hero section
          requestAnimationFrame(() => {
            const heroSection = document.querySelector(".hero-section-transition");
            if (heroSection) {
              (heroSection as HTMLElement).style.willChange = "auto";
            }
          });
        },
        transitionSettings.duration * 1000 + 50 // Reduced from 100ms to 50ms
      );
    } else if (!isBlurring) {
      // Remove blur INSTANTLY for faster transitions
      const removeBlur = () => {
        document.body.style.filter = "blur(0px)";
        document.body.style.overflow = "";

        // Also remove from hero section - ensure smooth removal
        requestAnimationFrame(() => {
          const heroSection = document.querySelector(".hero-section-transition");
          if (heroSection) {
            const heroEl = heroSection as HTMLElement;
            // Faster blur removal - reduced duration
            heroEl.style.transition = `filter ${transitionSettings.duration * 0.6}s cubic-bezier(0.4, 0, 0.2, 1), opacity ${transitionSettings.duration * 0.6}s cubic-bezier(0.4, 0, 0.2, 1)`;
            heroEl.style.filter = "blur(0px)";
          }
        });

        // Faster cleanup - reduced delays
        setTimeout(() => {
          document.body.style.willChange = "auto";
          requestAnimationFrame(() => {
            const heroSection = document.querySelector(".hero-section-transition");
            if (heroSection) {
              const heroEl = heroSection as HTMLElement;
              heroEl.style.willChange = "auto";
              // Remove transition after animation completes - faster cleanup
              setTimeout(() => {
                heroEl.style.transition = "";
              }, transitionSettings.duration * 600); // Reduced from 800ms
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
      // Cleanup
      document.body.style.filter = "";
      document.body.style.overflow = "";
      document.body.style.willChange = "auto";

      const heroSection = document.querySelector(".hero-section-transition");
      if (heroSection) {
        (heroSection as HTMLElement).style.filter = "";
        (heroSection as HTMLElement).style.willChange = "auto";
      }
    };
  }, [isBlurring, transitionSettings]);

  // Skip overlay animation if reduced motion
  if (deviceInfo.prefersReducedMotion) {
    return null;
  }

  // Optimized easing function untuk smoother animation
  const easingFunction = "easeInOut";

  return (
    <AnimatePresence mode="wait">
      {isActive && (
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
