/**
 * Fetch CMS content by page and locale (for frontend).
 * Use in pages that need dynamic bilingual content from ContentEntry.
 */

import { useCallback, useEffect, useState } from "react";

export type ContentSection = {
  sectionName: string;
  title: string;
  description: string | null;
};

export type ContentByPage = {
  page: string;
  locale: "id" | "en";
  sections: ContentSection[];
};

export function useContent(
  page: string,
  locale: string
): {
  data: ContentByPage | null;
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
} {
  const [data, setData] = useState<ContentByPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchContent = useCallback(async () => {
    if (!page?.trim()) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/content?page=${encodeURIComponent(page)}&locale=${locale === "id" ? "id" : "en"}`
      );
      if (!res.ok) throw new Error("Failed to load content");
      const json = await res.json();
      setData({
        page: json.page,
        locale: json.locale,
        sections: Array.isArray(json.sections) ? json.sections : [],
      });
    } catch (e) {
      setError(e instanceof Error ? e : new Error(String(e)));
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [page, locale]);

  useEffect(() => {
    fetchContent();
  }, [fetchContent]);

  return { data, loading, error, refetch: fetchContent };
}

/**
 * Get a section by name from content data.
 */
export function getSection(
  data: ContentByPage | null,
  sectionName: string
): ContentSection | undefined {
  return data?.sections.find(
    (s) => s.sectionName.toLowerCase() === sectionName.toLowerCase()
  );
}
