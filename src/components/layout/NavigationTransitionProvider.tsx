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
      const pathname = url.pathname;
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
        const pathname = url.pathname;
        // Normalize home path
        if (pathname === "/" || pathname === "/en" || pathname === "/id") {
          return "/";
        }
        return pathname + url.search;
      } catch (urlError) {
        // Fallback: manual pathname extraction
        const pathname = href.split("?")[0].split("#")[0];
        if (pathname === "/" || pathname === "/en" || pathname === "/id") {
          return "/";
        }
        return pathname;
      }
    }
    
    // Fallback: normalize home paths manually
    const pathname = href.split("?")[0].split("#")[0];
    if (pathname === "/" || pathname === "/en" || pathname === "/id") {
      return "/";
    }
    return pathname;
  } catch (error) {
    // Final fallback: return href as-is if it's a simple path
    const pathname = href.split("?")[0].split("#")[0];
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
      const normalizedPathname = pathname === "/" || pathname === "/en" || pathname === "/id" ? "/" : pathname;
      if (normalized === normalizedPathname) {
        // Already on target page, no transition needed
        return;
      }

      // Clear any existing timeout
      if (transitionTimeoutRef.current) {
        clearTimeout(transitionTimeoutRef.current);
        transitionTimeoutRef.current = null;
      }

      // PRODUCTION-SAFE: Use requestAnimationFrame to ensure smooth transition start
      requestAnimationFrame(() => {
        targetPathRef.current = normalized;
        startTimeRef.current = Date.now();
        setIsActive(true);
        console.log("[NavigationTransition] Transition started:", { from: pathname, to: normalized });
      });
    },
    [pathname]
  );

  useEffect(() => {
    // PRODUCTION-SAFE: Ensure window exists
    if (typeof window === "undefined") return;

    if (!isActive || !targetPathRef.current) return;

    // Normalize pathname for comparison (home paths: "/", "/en", "/id" → "/")
    const normalizedPathname =
      pathname === "/" || pathname === "/en" || pathname === "/id" ? "/" : pathname;
    const normalizedTarget =
      targetPathRef.current === "/" ||
      targetPathRef.current === "/en" ||
      targetPathRef.current === "/id"
        ? "/"
        : targetPathRef.current;

    if (normalizedPathname === normalizedTarget) {
      const elapsed = Date.now() - startTimeRef.current;

      // ULTRA FAST transition timing based on device
      // Mobile: ultra fast (100ms), Desktop: fast (150ms)
      // PRODUCTION-SAFE: Enhanced window checks
      const isMobile = typeof window !== "undefined" && window.innerWidth < 768;
      const prefersReducedMotion =
        typeof window !== "undefined" &&
        typeof window.matchMedia !== "undefined" &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches;

      // Significantly reduced timing for faster transitions
      let minimumVisible = 150; // Reduced from 350ms to 150ms (57% faster)
      if (prefersReducedMotion) {
        minimumVisible = 0; // Instant for reduced motion
      } else if (isMobile) {
        minimumVisible = 100; // Reduced from 200ms to 100ms (50% faster)
      }

      const remaining = elapsed >= minimumVisible ? 0 : minimumVisible - elapsed; // Changed from 50ms to 0ms

      transitionTimeoutRef.current = setTimeout(() => {
        setIsActive(false);
        targetPathRef.current = null;
        startTimeRef.current = 0;
      }, remaining);

      return () => {
        if (transitionTimeoutRef.current) {
          clearTimeout(transitionTimeoutRef.current);
        }
      };
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
