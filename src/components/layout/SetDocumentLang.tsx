"use client";

import { useEffect } from "react";

/**
 * Sets the `lang` attribute on <html> to match the active locale.
 * Needed because <html> is rendered once in root layout; the [locale] layout
 * cannot render its own <html> tag without nesting issues.
 */
export function SetDocumentLang({ locale }: { locale: string }) {
  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  return null;
}
