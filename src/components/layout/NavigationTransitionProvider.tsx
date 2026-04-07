"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { usePathname } from "next/navigation";

type NavigationTransitionContextValue = {
  beginTransition: (href: string) => void;
  isActive: boolean;
};

const NavigationTransitionContext = createContext<NavigationTransitionContextValue | undefined>(
  undefined
);

function normalizeHref(href: string): string | null {
  if (!href) return null;
  if (href.startsWith("#")) return null;

  // PRODUCTION-SAFE: Enhanced URL normalization with better error handling
  try {
    // Handle absolute URLs
    if (href.startsWith("http://") || href.startsWith("https://")) {
      const url = new URL(href);
      let pathname = url.pathname;
      // ENHANCED: Remove locale prefix for consistent comparison
      pathname = pathname.replace(/^\/[a-z]{2}\//, "/").replace(/^\/[a-z]{2}$/, "/");
      // Normalize home path - ensure "/", "/en", "/id" all map to "/"
      if (pathname === "/" || pathname === "/en" || pathname === "/id") {
        return "/";
      }
      return pathname + url.search;
    }

    // Handle relative URLs - PRODUCTION-SAFE: Use window.location.origin with fallback
    if (typeof window !== "undefined" && window.location) {
      try {
        const url = new URL(href, window.location.origin);
        let pathname = url.pathname;
        // ENHANCED: Remove locale prefix for consistent comparison
        pathname = pathname.replace(/^\/[a-z]{2}\//, "/").replace(/^\/[a-z]{2}$/, "/");
        // Normalize home path
        if (pathname === "/" || pathname === "/en" || pathname === "/id") {
          return "/";
        }
        return pathname + url.search;
      } catch (urlError) {
        // Fallback: manual pathname extraction
        let pathname = href.split("?")[0].split("#")[0];
        // ENHANCED: Remove locale prefix
        pathname = pathname.replace(/^\/[a-z]{2}\//, "/").replace(/^\/[a-z]{2}$/, "/");
        if (pathname === "/" || pathname === "/en" || pathname === "/id") {
          return "/";
        }
        return pathname;
      }
    }

    // Fallback: normalize home paths manually
    let pathname = href.split("?")[0].split("#")[0];
    // ENHANCED: Remove locale prefix
    pathname = pathname.replace(/^\/[a-z]{2}\//, "/").replace(/^\/[a-z]{2}$/, "/");
    if (pathname === "/" || pathname === "/en" || pathname === "/id") {
      return "/";
    }
    return pathname;
  } catch (error) {
    // Final fallback: return href as-is if it's a simple path
    let pathname = href.split("?")[0].split("#")[0];
    // ENHANCED: Remove locale prefix
    pathname = pathname.replace(/^\/[a-z]{2}\//, "/").replace(/^\/[a-z]{2}$/, "/");
    if (pathname === "/" || pathname === "/en" || pathname === "/id") {
      return "/";
    }
    return pathname.startsWith("/") ? pathname : `/${pathname}`;
  }
}

export function NavigationTransitionProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [isActive, setIsActive] = useState(false);
  const targetPathRef = useRef<string | null>(null);
  const startTimeRef = useRef<number>(0);
  const transitionTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const beginTransition = useCallback(
    (href: string) => {
      // PRODUCTION-SAFE: Enhanced checks with retry mechanism
      if (typeof window === "undefined") {
        console.warn("[NavigationTransition] Window not available, skipping transition");
        return;
      }

      // CRITICAL: Don't start transition during splash screen
      if (typeof document !== "undefined") {
        const splashShown = sessionStorage.getItem("splashShown");
        const bodyHasClass = document.body.classList.contains("splash-complete");
        const splashScreenExists = document.querySelector("[data-splash-screen]");

        // If splash is not complete, don't start transition
        if (splashShown !== "true" && !bodyHasClass && splashScreenExists) {
          console.log("[NavigationTransition] Splash screen active, skipping transition");
          return;
        }
      }

      // PRODUCTION-SAFE: Enhanced DOM readiness check with multiple retry attempts
      if (typeof document === "undefined" || !document.body) {
        // Retry with exponential backoff for production environments
        let retryCount = 0;
        const maxRetries = 5;
        const retryDelay = 10;

        const retryTimer = setInterval(() => {
          retryCount++;
          if (typeof document !== "undefined" && document.body) {
            clearInterval(retryTimer);
            // Use requestAnimationFrame to ensure DOM is fully ready
            requestAnimationFrame(() => {
              beginTransition(href);
            });
          } else if (retryCount >= maxRetries) {
            clearInterval(retryTimer);
            console.warn("[NavigationTransition] DOM not ready after retries, skipping transition");
          }
        }, retryDelay);

        return () => clearInterval(retryTimer);
      }

      // PRODUCTION-SAFE: Normalize href with enhanced error handling
      let normalized: string | null = null;
      try {
        normalized = normalizeHref(href);
      } catch (error) {
        console.error("[NavigationTransition] Error normalizing href:", error, { href });
        // Fallback: try simple path extraction
        const pathname = href.split("?")[0].split("#")[0];
        normalized = pathname === "/" || pathname === "/en" || pathname === "/id" ? "/" : pathname;
      }

      if (!normalized) {
        console.warn("[NavigationTransition] Invalid href, skipping transition:", href);
        return;
      }

      // Normalize current pathname for comparison
      // ENHANCED: Better normalization to handle locale prefixes
      const normalizedPathname =
        pathname === "/" || pathname === "/en" || pathname === "/id"
          ? "/"
          : pathname.replace(/^\/[a-z]{2}\//, "/").replace(/^\/[a-z]{2}$/, "/");

      // Also normalize the target href
      const normalizedTargetHref = normalized
        ?.replace(/^\/[a-z]{2}\//, "/")
        .replace(/^\/[a-z]{2}$/, "/");

      if (normalizedTargetHref === normalizedPathname) {
        // Already on target page, no transition needed
        console.log("[NavigationTransition] Already on target page, skipping:", {
          current: normalizedPathname,
          target: normalizedTargetHref,
        });
        return;
      }

      // Clear any existing timeout
      if (transitionTimeoutRef.current) {
        clearTimeout(transitionTimeoutRef.current);
        transitionTimeoutRef.current = null;
      }

      // ENHANCED: Apply blur immediately for visible effect
      // Use synchronous state update to ensure blur is applied before Next.js navigation
      targetPathRef.current = normalized;
      startTimeRef.current = Date.now();
      setIsActive(true);
      console.log("[NavigationTransition] Transition started:", {
        from: pathname,
        to: normalized,
      });

      // Force a re-render to ensure blur is applied immediately
      // Use requestAnimationFrame as fallback for smooth animation
      requestAnimationFrame(() => {
        // Ensure blur is visible
        if (typeof document !== "undefined" && document.body) {
          // Blur should already be applied by PageTransitionOverlay
          // This is just to ensure it's visible
        }
      });
    },
    [pathname]
  );

  useEffect(() => {
    // PRODUCTION-SAFE: Ensure window exists
    if (typeof window === "undefined") return;

    if (!isActive || !targetPathRef.current) return;

    // ENHANCED: Normalize pathname for comparison (home paths: "/", "/en", "/id" → "/")
    // Also handle locale prefixes in pathnames
    const normalizedPathname =
      pathname === "/" || pathname === "/en" || pathname === "/id"
        ? "/"
        : pathname.replace(/^\/[a-z]{2}\//, "/").replace(/^\/[a-z]{2}$/, "/");

    const normalizedTarget =
      targetPathRef.current === "/" ||
      targetPathRef.current === "/en" ||
      targetPathRef.current === "/id"
        ? "/"
        : targetPathRef.current.replace(/^\/[a-z]{2}\//, "/").replace(/^\/[a-z]{2}$/, "/");

    if (normalizedPathname === normalizedTarget) {
      const elapsed = Date.now() - startTimeRef.current;

      // ENHANCED transition timing - longer duration for visible blur effect
      // Mobile: 450ms, Desktop: 550ms - ensures blur is clearly visible and smooth
      // PRODUCTION-SAFE: Enhanced window checks
      const isMobile = typeof window !== "undefined" && window.innerWidth < 768;
      const prefersReducedMotion =
        typeof window !== "undefined" &&
        typeof window.matchMedia !== "undefined" &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches;

      // Longer timing to ensure DEEP blur effect is visible and smooth
      // Increased to match PageTransitionOverlay duration (500ms desktop, 450ms mobile)
      let minimumVisible = 600; // Increased for visible DEEP blur effect (matches 500ms + buffer)
      if (prefersReducedMotion) {
        minimumVisible = 0; // Instant for reduced motion
      } else if (isMobile) {
        minimumVisible = 500; // Mobile: 500ms for visible blur (matches 450ms + buffer)
      }

      const remaining = elapsed >= minimumVisible ? 0 : minimumVisible - elapsed;

      console.log("[NavigationTransition] Pathname matched, removing blur in:", {
        remaining,
        elapsed,
        from: targetPathRef.current,
        to: normalizedPathname,
      });

      transitionTimeoutRef.current = setTimeout(() => {
        console.log("[NavigationTransition] Setting isActive to false - blur should be removed");
        setIsActive(false);
        targetPathRef.current = null;
        startTimeRef.current = 0;

        // CRITICAL: Force remove blur as fallback if PageTransitionOverlay doesn't catch it
        setTimeout(() => {
          if (typeof document !== "undefined" && document.body) {
            // Double-check blur is removed
            if (document.body.style.filter.includes("blur")) {
              console.warn("[NavigationTransition] Blur still present, forcing removal");
              document.body.style.filter = "blur(0px)";
              document.body.style.opacity = "1";
            }
          }
        }, 100);
      }, remaining);

      return () => {
        if (transitionTimeoutRef.current) {
          clearTimeout(transitionTimeoutRef.current);
        }
      };
    } else {
      // CRITICAL: If pathname doesn't match but isActive is true, check if we should timeout
      // This handles cases where pathname detection might fail
      if (isActive && targetPathRef.current) {
        const elapsed = Date.now() - startTimeRef.current;
        // Safety timeout: if transition is active for more than 3 seconds, force remove blur
        if (elapsed > 3000) {
          console.warn("[NavigationTransition] Safety timeout - forcing blur removal after 3s");
          setIsActive(false);
          targetPathRef.current = null;
          startTimeRef.current = 0;
        }
      }
    }
  }, [pathname, isActive]);

  const value = useMemo(() => ({ beginTransition, isActive }), [beginTransition, isActive]);

  return (
    <NavigationTransitionContext.Provider value={value}>
      {children}
    </NavigationTransitionContext.Provider>
  );
}

export function useNavigationTransition() {
  const ctx = useContext(NavigationTransitionContext);
  if (!ctx) {
    // CRITICAL: Provide helpful error message with solution
    // This prevents silent failures and helps developers fix issues quickly
    throw new Error(
      "useNavigationTransition must be used within NavigationTransitionProvider. " +
        "Please ensure the component using this hook is wrapped with NavigationTransitionProvider. " +
        "For verify pages, use src/app/verify/layout.tsx as a reference."
    );
  }
  return ctx;
}

/**
 * Safe version of useNavigationTransition that returns null if provider is not available
 * Use this in components that may be used outside NavigationTransitionProvider context
 */
export function useNavigationTransitionSafe() {
  const ctx = useContext(NavigationTransitionContext);
  return ctx || null;
}
