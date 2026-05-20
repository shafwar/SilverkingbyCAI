"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type PageSectionEntry = { url: string; mediaType: string; version?: number };

/** Cache-bust media URL so browser never serves stale file after replace/restore */
export function getCacheBustedMediaUrl(url: string, version?: number): string {
  if (url == null || url === "") return url;
  if (version == null) return url;
  const sep = url.includes("?") ? "&" : "?";
  return `${url}${sep}v=${version}`;
}

type UsePageSectionsOptions = {
  /** When false, skips network fetch until enabled (reduces contention off-home). */
  enabled?: boolean;
};

export function usePageSections(page: string, options?: UsePageSectionsOptions) {
  const enabled = options?.enabled !== false;
  const [sections, setSections] = useState<Record<string, PageSectionEntry>>({});
  const [loading, setLoading] = useState(true);
  const refetchRef = useRef<() => Promise<void>>(() => Promise.resolve());

  const refetch = useCallback(async () => {
    if (!enabled || !page) {
      setSections({});
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const url = `/api/page-sections?page=${encodeURIComponent(page)}&_t=${Date.now()}`;
      const res = await fetch(url, { cache: "no-store" });
      if (!res.ok) {
        setSections({});
        return;
      }
      const data = await res.json();
      setSections(data.sections ?? {});
    } catch {
      setSections({});
    } finally {
      setLoading(false);
    }
  }, [page, enabled]);

  refetchRef.current = refetch;

  // Always fetch fresh on mount (no cache) so replaced assets never flash old version when returning to page
  useEffect(() => {
    let cancelled = false;
    if (!enabled || !page) {
      setSections({});
      setLoading(false);
      return;
    }
    setLoading(true);
    const url = `/api/page-sections?page=${encodeURIComponent(page)}&_t=${Date.now()}`;
    fetch(url, { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : { sections: {} }))
      .then((data) => {
        if (!cancelled) setSections(data.sections ?? {});
      })
      .catch(() => {
        if (!cancelled) setSections({});
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [page, enabled]);

  // When page is restored from bfcache (back/forward), refetch so we never show stale asset
  useEffect(() => {
    if (!enabled || !page) return;
    const handlePageShow = (e: PageTransitionEvent) => {
      if (e.persisted) refetchRef.current();
    };
    window.addEventListener("pageshow", handlePageShow);
    return () => window.removeEventListener("pageshow", handlePageShow);
  }, [page, enabled]);

  return { sections, loading, refetch };
}
