"use client";

import { useCallback, useEffect, useState } from "react";

export type PageMediaPayload = {
  page: string;
  heroImageUrl: string | null;
  heroVideoUrl: string | null;
};

/**
 * Read-only fetch of PageMedia (hero image / video URLs). Does not change CMS;
 * used for optional poster image when hero is video.
 */
type UsePageMediaOptions = {
  enabled?: boolean;
};

export function usePageMedia(page: string, options?: UsePageMediaOptions) {
  const enabled = options?.enabled !== false;
  const [data, setData] = useState<PageMediaPayload | null>(null);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(async () => {
    if (!enabled || !page) {
      setData(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/page-media?page=${encodeURIComponent(page)}`, {
        cache: "no-store",
      });
      if (!res.ok) {
        setData(null);
        return;
      }
      const json = (await res.json()) as PageMediaPayload;
      setData(json);
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [page, enabled]);

  useEffect(() => {
    let cancelled = false;
    if (!enabled || !page) {
      setData(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    fetch(`/api/page-media?page=${encodeURIComponent(page)}`, { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (!cancelled && json) setData(json as PageMediaPayload);
      })
      .catch(() => {
        if (!cancelled) setData(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [page, enabled]);

  return { data, loading, refetch };
}
