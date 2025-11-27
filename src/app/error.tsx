'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { routing } from '@/i18n/routing';
import { GeistSans } from "geist/font/sans";
import { Playfair_Display } from "next/font/google";
import "@/styles/globals.css";

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair",
  display: "swap",
  preload: true,
});

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Application error:', error);
  }, [error]);

  return (
    <html lang={routing.defaultLocale} className={`${GeistSans.variable} ${playfair.variable}`}>
      <body className={`${GeistSans.className} antialiased min-h-screen bg-luxury-black text-white flex items-center justify-center`}>
        <div className="text-center space-y-6 px-6 max-w-md">
          <h1 className="text-6xl font-light text-white">500</h1>
          <div className="h-px w-16 mx-auto bg-gradient-to-r from-transparent via-white/20 to-transparent" />
          <h2 className="text-xl font-semibold text-white">Something went wrong!</h2>
          <p className="text-base text-luxury-silver/70">
            {error.message || 'An unexpected error occurred. Please try again.'}
          </p>
          <div className="flex gap-4 justify-center pt-4">
            <button
              onClick={reset}
              className="px-6 py-3 rounded-full bg-gradient-to-r from-luxury-gold to-luxury-lightGold text-black font-semibold hover:shadow-lg transition-all"
            >
              Try again
            </button>
            <Link
              href="/"
              className="px-6 py-3 rounded-full border border-white/20 bg-white/5 text-white font-semibold hover:border-white/40 hover:bg-white/10 transition-all"
            >
              Back to Home
            </Link>
          </div>
        </div>
      </body>
    </html>
  );
}

