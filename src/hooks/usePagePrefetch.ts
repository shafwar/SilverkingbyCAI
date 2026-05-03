"use client";

import { useEffect } from "react";
import { useRouter } from "@/i18n/routing";
import { useLocale } from "next-intl";
import { getNetworkTier } from "@/utils/network-profile";

/**
 * Global hook for page prefetching — toned down on slow / Save-Data so first load stays responsive.
 */
export function usePagePrefetch() {
  const router = useRouter();
  const locale = useLocale();

  useEffect(() => {
    const tier = getNetworkTier();
    if (tier === "slow") {
      return;
    }

    // All main navigation routes - prioritize most visited
    const routes = ["/", "/about", "/products", "/what-we-do", "/authenticity", "/contact"];

    const prefetchRoute = (path: string) => {
      try {
        router.prefetch(path);
      } catch {
        /* ignore */
      }
    };

    // Use requestIdleCallback for non-blocking prefetching
    const schedulePrefetch = (route: string, delay: number) => {
      if (typeof window !== "undefined" && "requestIdleCallback" in window) {
        requestIdleCallback(
          () => {
            setTimeout(() => prefetchRoute(route), delay);
          },
          { timeout: 3500 }
        );
      } else {
        // Fallback for browsers without requestIdleCallback
        setTimeout(() => prefetchRoute(route), delay);
      }
    };

    let cancelled = false;

    if (tier === "medium") {
      const start = () => {
        if (cancelled) return;
        try {
          router.prefetch("/");
        } catch {
          /* ignore */
        }
        setTimeout(() => {
          if (cancelled) return;
          try {
            router.prefetch("/about");
          } catch {
            /* ignore */
          }
        }, 600);
      };
      const delayed = window.setTimeout(start, 5200);
      return () => {
        cancelled = true;
        clearTimeout(delayed);
      };
    }

    const runInitialPrefetch = () => {
      if (cancelled) return;
      prefetchRoute("/");
      prefetchRoute("/about");
      routes.slice(2).forEach((route, index) => {
        schedulePrefetch(route, (index + 1) * 900);
      });
    };

    if (typeof window !== "undefined" && "requestIdleCallback" in window) {
      requestIdleCallback(runInitialPrefetch, { timeout: 2800 });
    } else {
      setTimeout(runInitialPrefetch, 800);
    }

    return () => {
      cancelled = true;
    };
  }, [router, locale]);
}
