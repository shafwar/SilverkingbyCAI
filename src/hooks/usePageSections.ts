"use client";

import { useCallback, useEffect, useState } from "react";

export type PageSectionEntry = { url: string; mediaType: string };

export function usePageSections(page: string) {
  const [sections, setSections] = useState<Record<string, PageSectionEntry>>({});
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(async () => {
    if (!page) {
      setSections({});
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/page-sections?page=${encodeURIComponent(page)}`);
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
  }, [page]);

  useEffect(() => {
    let cancelled = false;
    if (!page) {
      setSections({});
      setLoading(false);
      return;
    }
    setLoading(true);
    fetch(`/api/page-sections?page=${encodeURIComponent(page)}`)
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
  }, [page]);

  return { sections, loading, refetch };
}
