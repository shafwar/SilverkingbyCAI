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
  try {
    const url = href.startsWith("http") ? new URL(href) : new URL(href, window.location.origin);
    // Normalize home path - ensure "/", "/en", "/id" all map to "/"
    const pathname = url.pathname;
    if (pathname === "/" || pathname === "/en" || pathname === "/id") {
      return "/";
    }
    return pathname + url.search;
  } catch {
    // Fallback: normalize home paths
    if (href === "/" || href === "/en" || href === "/id") {
      return "/";
    }
    return href;
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
      if (typeof window === "undefined") return;
      const normalized = normalizeHref(href);
      if (!normalized) return;
      if (normalized === pathname) return;

      // Clear any existing timeout
      if (transitionTimeoutRef.current) {
        clearTimeout(transitionTimeoutRef.current);
      }

      targetPathRef.current = normalized;
      startTimeRef.current = Date.now();
      setIsActive(true);
    },
    [pathname]
  );

  useEffect(() => {
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
      const isMobile = typeof window !== "undefined" && window.innerWidth < 768;
      const prefersReducedMotion =
        typeof window !== "undefined" &&
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
