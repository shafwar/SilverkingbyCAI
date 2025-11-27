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

export default function NotFound() {
  return (
    <html lang={routing.defaultLocale} className={`${GeistSans.variable} ${playfair.variable}`}>
      <body className={`${GeistSans.className} antialiased min-h-screen bg-luxury-black text-white flex items-center justify-center`}>
        <div className="text-center space-y-6 px-6">
          <h1 className="text-6xl font-light text-white">404</h1>
          <div className="h-px w-16 mx-auto bg-gradient-to-r from-transparent via-white/20 to-transparent" />
          <p className="text-lg text-luxury-silver/70">This page could not be found.</p>
          <Link
            href="/"
            className="inline-block mt-8 px-6 py-3 rounded-full bg-gradient-to-r from-luxury-gold to-luxury-lightGold text-black font-semibold hover:shadow-lg transition-all"
          >
            Back to Home
          </Link>
        </div>
      </body>
    </html>
  );
}

