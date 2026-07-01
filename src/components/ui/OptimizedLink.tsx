"use client";

import { Link } from "@/i18n/routing";
import { useRouter } from "@/i18n/routing";
import { useCallback, useRef, useEffect, type ComponentProps, type ReactNode } from "react";

interface OptimizedLinkProps extends Omit<ComponentProps<typeof Link>, "prefetch"> {
  children: ReactNode;
  prefetch?: boolean;
  prefetchOnHover?: boolean;
  prefetchDelay?: number;
}

/**
 * OptimizedLink — locale-aware Link + `router.prefetch` on mount/hover (no extra head <link> spam).
 */
export function OptimizedLink({
  href,
  children,
  prefetch = false,
  prefetchOnHover = true,
  prefetchDelay = 0,
  className,
  onClick,
  ...props
}: OptimizedLinkProps) {
  const router = useRouter();
  const prefetchedRef = useRef<Set<string>>(new Set());
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  /** router.prefetch only — avoids duplicate <link> tags + head churn (same work as manual RSC prefetch). */
  const prefetchRoute = useCallback(
    (path: string) => {
      if (path.startsWith("http")) return;
      const key = path.toString();
      if (prefetchedRef.current.has(key)) return;
      prefetchedRef.current.add(key);
      try {
        router.prefetch(path);
      } catch {
        /* ignore */
      }
    },
    [router]
  );

  // Prefetch on mount - PRODUCTION-SAFE: Enhanced with proper checks
  useEffect(() => {
    if (prefetch && typeof window !== "undefined" && typeof document !== "undefined") {
      const timer = setTimeout(() => {
        prefetchRoute(href.toString());
      }, prefetchDelay);
      return () => clearTimeout(timer);
    }
  }, [prefetch, prefetchDelay, href, prefetchRoute]);

  // Handle hover prefetching
  const handleMouseEnter = useCallback(() => {
    if (!prefetchOnHover) return;

    // Clear any existing timeout
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }

    // Prefetch immediately on hover (no delay for instant feel)
    hoverTimeoutRef.current = setTimeout(() => {
      prefetchRoute(href.toString());
    }, 0); // Instant prefetch on hover for maximum speed
  }, [prefetchOnHover, prefetchRoute, href]);

  const handleMouseLeave = useCallback(() => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
  }, []);

  // Handle click to trigger transition
  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLAnchorElement>) => {
      // Call original onClick if provided
      if (onClick) {
        onClick(e);
      }

      // Don't trigger transition for special keys or hash links
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) {
        return;
      }

      const hrefStr = href.toString();
      if (hrefStr.startsWith("#") || hrefStr.includes("#")) {
        return;
      }

      // No transition - direct navigation
    },
    [onClick, href]
  );

  return (
    <Link
      href={href}
      prefetch={prefetch}
      className={className}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={handleClick}
      {...props}
    >
      {children}
    </Link>
  );
}
