"use client";

/**
 * Locale-level error boundary (Next.js App Router convention).
 *
 * Catches rendering errors within any [locale] route — including cascading
 * failures triggered by broken image loads — and logs them before showing a
 * graceful recovery UI. This prevents a single broken asset from producing an
 * unhandled 5xx response and the retry traffic that follows.
 */

import { useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";

export default function LocaleError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const params = useParams();
  const locale = typeof params?.locale === "string" ? params.locale : "en";

  useEffect(() => {
    // Structured log so the error is easy to find in log aggregators.
    console.error("[LocaleError] Caught rendering error:", {
      message: error.message,
      digest: error.digest,
      stack: error.stack,
    });
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-luxury-black px-6 text-white">
      <div className="max-w-md space-y-6 text-center">
        <h1 className="text-5xl font-light text-white">Oops</h1>
        <div className="mx-auto h-px w-16 bg-gradient-to-r from-transparent via-white/20 to-transparent" />
        <h2 className="text-xl font-semibold text-white">Something went wrong</h2>
        <p className="text-base leading-relaxed text-white/60">
          {error.message || "An unexpected error occurred. Please try again."}
        </p>
        <div className="flex justify-center gap-4 pt-4">
          <button
            onClick={reset}
            className="rounded-full bg-gradient-to-r from-luxury-gold to-yellow-400 px-6 py-3 font-semibold text-black transition-all hover:shadow-lg"
          >
            Try again
          </button>
          <Link
            href={`/${locale}`}
            className="rounded-full border border-white/20 bg-white/5 px-6 py-3 font-semibold text-white transition-all hover:border-white/40 hover:bg-white/10"
          >
            Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}
