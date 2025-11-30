"use client";

import { useEffect } from "react";
import { useRouter } from "@/i18n/routing";
import { useLocale } from "next-intl";
import { routing } from "@/i18n/routing";

/**
 * Global hook for aggressive page prefetching
 * Prefetches all main navigation routes when component mounts
 */
export function usePagePrefetch() {
  const router = useRouter();
  const locale = useLocale();

  useEffect(() => {
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

    // Prefetch critical routes immediately
    prefetchRoute("/");
    prefetchRoute("/about");

    // Prefetch other routes with staggered timing (non-blocking)
    routes.slice(2).forEach((route, index) => {
      schedulePrefetch(route, (index + 1) * 200); // Stagger by 200ms
    });

    // Also prefetch again after page is fully loaded (idle time)
    const handleLoad = () => {
      if (typeof window !== "undefined" && "requestIdleCallback" in window) {
        requestIdleCallback(
          () => {
            routes.forEach((route) => {
              prefetchRoute(route);
            });
          },
          { timeout: 3000 }
        );
      } else {
        setTimeout(() => {
          routes.forEach((route) => {
            prefetchRoute(route);
          });
        }, 1000);
      }
    };

    if (typeof window !== "undefined") {
      if (document.readyState === "complete") {
        handleLoad();
      } else {
        window.addEventListener("load", handleLoad, { once: true });
        return () => window.removeEventListener("load", handleLoad);
      }
    }
  }, [router, locale]);
}
