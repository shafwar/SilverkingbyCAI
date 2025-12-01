"use client";

import { usePagePrefetch } from "@/hooks/usePagePrefetch";

/**
 * Client component wrapper for global page prefetching
 * This ensures all pages are prefetched when any page loads
 */
export function PagePrefetchClient() {
  usePagePrefetch();
  return null;
}






