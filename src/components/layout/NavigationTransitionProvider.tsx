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

const NavigationTransitionContext = createContext<NavigationTransitionContextValue | undefined>(undefined);

function normalizeHref(href: string): string | null {
  if (!href) return null;
  if (href.startsWith("#")) return null;
  try {
    const url = href.startsWith("http") ? new URL(href) : new URL(href, window.location.origin);
    return url.pathname + url.search;
  } catch {
    return href;
  }
}

export function NavigationTransitionProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [isActive, setIsActive] = useState(false);
  const targetPathRef = useRef<string | null>(null);
  const startTimeRef = useRef<number>(0);

  const beginTransition = useCallback(
    (href: string) => {
      if (typeof window === "undefined") return;
      const normalized = normalizeHref(href);
      if (!normalized) return;
      if (normalized === pathname) return;
      targetPathRef.current = normalized;
      startTimeRef.current = Date.now();
      setIsActive(true);
    },
    [pathname]
  );

  useEffect(() => {
    if (!isActive || !targetPathRef.current) return;
    if (pathname === targetPathRef.current) {
      const elapsed = Date.now() - startTimeRef.current;
      const minimumVisible = 1200;
      const remaining = elapsed >= minimumVisible ? 0 : minimumVisible - elapsed;

      const timer = setTimeout(() => {
        setIsActive(false);
        targetPathRef.current = null;
        startTimeRef.current = 0;
      }, remaining);
      return () => clearTimeout(timer);
    }
  }, [pathname, isActive]);

  const value = useMemo(() => ({ beginTransition, isActive }), [beginTransition, isActive]);

  return (
    <NavigationTransitionContext.Provider value={value}>{children}</NavigationTransitionContext.Provider>
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


