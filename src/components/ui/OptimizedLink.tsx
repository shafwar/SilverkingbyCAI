"use client";

import { Link } from "@/i18n/routing";
import { useRouter } from "@/i18n/routing";
import { useLocale } from "next-intl";
import { routing } from "@/i18n/routing";
import { useCallback, useRef, useEffect, type ComponentProps, type ReactNode } from "react";
import { useNavigationTransitionSafe } from "@/components/layout/NavigationTransitionProvider";

interface OptimizedLinkProps extends Omit<ComponentProps<typeof Link>, "prefetch"> {
  children: ReactNode;
  prefetch?: boolean;
  prefetchOnHover?: boolean;
  prefetchDelay?: number;
}

/**
 * OptimizedLink - Enhanced Link component with aggressive prefetching
 * - Automatically prefetches on mount if prefetch={true}
 * - Prefetches on hover for instant navigation
 * - Uses multiple prefetch strategies for maximum performance
 */
export function OptimizedLink({
  href,
  children,
  prefetch = true,
  prefetchOnHover = true,
  prefetchDelay = 0,
  className,
  onClick,
  ...props
}: OptimizedLinkProps) {
  const router = useRouter();
  const locale = useLocale();
  const prefetchedRef = useRef<Set<string>>(new Set());
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Get transition hook safely - returns null if not in provider context
  // This allows OptimizedLink to work even outside NavigationTransitionProvider
  const transitionContext = useNavigationTransitionSafe();
  const beginTransition = transitionContext?.beginTransition || null;

  // Build full path with locale
  const getFullPath = useCallback(
    (path: string) => {
      if (path.startsWith("http")) return path;
      const normalizedPath = path.startsWith("/") ? path : `/${path}`;
      return locale === routing.defaultLocale
        ? normalizedPath
        : `/${locale}${normalizedPath === "/" ? "" : normalizedPath}`;
    },
    [locale]
  );

  // Aggressive prefetching function
  const prefetchRoute = useCallback(
    (path: string) => {
      const fullPath = getFullPath(path);
      const cacheKey = fullPath;

      // Skip if already prefetched
      if (prefetchedRef.current.has(cacheKey)) return;
      prefetchedRef.current.add(cacheKey);

      // Strategy 1: Use next-intl router.prefetch
      try {
        router.prefetch(path);
      } catch (e) {
        // Silently fail
      }

      // Strategy 2: Browser link prefetch - PRODUCTION-SAFE: Enhanced checks
      if (typeof window !== "undefined" && typeof document !== "undefined" && document.head) {
        try {
          const link = document.createElement("link");
          link.rel = "prefetch";
          link.as = "document";
          link.href = fullPath;
          document.head.appendChild(link);
        } catch (e) {
          // Silently fail
        }

        // Strategy 3: Prefetch RSC payload
        try {
          const rscLink = document.createElement("link");
          rscLink.rel = "prefetch";
          rscLink.as = "fetch";
          rscLink.href = `${fullPath}?_rsc=`;
          rscLink.crossOrigin = "anonymous";
          document.head.appendChild(rscLink);
        } catch (e) {
          // Silently fail
        }

        // Strategy 4: DNS prefetch for external links
        if (path.startsWith("http")) {
          try {
            const url = new URL(path);
            const dnsLink = document.createElement("link");
            dnsLink.rel = "dns-prefetch";
            dnsLink.href = `${url.protocol}//${url.hostname}`;
            document.head.appendChild(dnsLink);
          } catch (e) {
            // Silently fail
          }
        }
      }
    },
    [router, getFullPath]
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

      // Trigger smooth transition dengan blur effect
      // PRODUCTION-SAFE: Enhanced with DOM readiness check
      // Use requestAnimationFrame untuk ensure smooth start
      if (beginTransition) {
        if (typeof window !== "undefined" && typeof document !== "undefined" && document.body) {
          requestAnimationFrame(() => {
            beginTransition(hrefStr);
          });
        } else {
          // Retry after DOM is ready
          const retryTimer = setTimeout(() => {
            if (typeof window !== "undefined" && typeof document !== "undefined" && document.body) {
              requestAnimationFrame(() => {
                beginTransition(hrefStr);
              });
            }
          }, 10);
          // Note: Cleanup handled by component lifecycle
        }
      }
    },
    [onClick, beginTransition, href]
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
