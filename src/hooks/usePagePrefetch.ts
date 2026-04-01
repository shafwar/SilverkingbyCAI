"use client";

import { useEffect } from "react";
import { useRouter } from "@/i18n/routing";
import { useLocale } from "next-intl";
import { routing } from "@/i18n/routing";
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
      const fullPath =
        locale === routing.defaultLocale ? path : `/${locale}${path === "/" ? "" : path}`;

      // Strategy 1: Use router.prefetch (most efficient for Next.js)
      try {
        router.prefetch(path);
      } catch (e) {
        // Silently fail
      }

      // Strategy 2: Browser link prefetch (only if not already prefetched)
      if (typeof window !== "undefined") {
        const existingLink = document.querySelector(`link[rel="prefetch"][href="${fullPath}"]`);
        if (!existingLink) {
          try {
            const link = document.createElement("link");
            link.rel = "prefetch";
            link.as = "document";
            link.href = fullPath;
            document.head.appendChild(link);
          } catch (e) {
            // Silently fail
          }
        }

        // Strategy 3: Prefetch RSC payload (React Server Components)
        const existingRscLink = document.querySelector(
          `link[rel="prefetch"][href="${fullPath}?_rsc="]`
        );
        if (!existingRscLink) {
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
        }
      }
    };

    // Use requestIdleCallback for non-blocking prefetching
    const schedulePrefetch = (route: string, delay: number) => {
      if (typeof window !== "undefined" && "requestIdleCallback" in window) {
        requestIdleCallback(
          () => {
            setTimeout(() => prefetchRoute(route), delay);
          },
          { timeout: 2000 }
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
      const delayed = window.setTimeout(start, 4500);
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
        schedulePrefetch(route, (index + 1) * 350);
      });
    };

    if (typeof window !== "undefined" && "requestIdleCallback" in window) {
      requestIdleCallback(runInitialPrefetch, { timeout: 1400 });
    } else {
      setTimeout(runInitialPrefetch, 450);
    }

    const handleLoad = () => {
      if (cancelled) return;
      if (typeof window !== "undefined" && "requestIdleCallback" in window) {
        requestIdleCallback(
          () => {
            if (cancelled) return;
            routes.forEach((route) => {
              prefetchRoute(route);
            });
          },
          { timeout: 4000 }
        );
      } else {
        setTimeout(() => {
          if (cancelled) return;
          routes.forEach((route) => {
            prefetchRoute(route);
          });
        }, 1500);
      }
    };

    if (typeof window !== "undefined") {
      if (document.readyState === "complete") {
        handleLoad();
      } else {
        window.addEventListener("load", handleLoad, { once: true });
      }
    }

    return () => {
      cancelled = true;
      window.removeEventListener("load", handleLoad);
    };
  }, [router, locale]);
}
