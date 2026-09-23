import type { Metadata, Viewport } from "next";
import { GeistSans } from "geist/font/sans";
import { Playfair_Display } from "next/font/google";
import "@/styles/globals.css";
import { APP_NAME, APP_DESCRIPTION, getBaseUrl } from "@/utils/constants";
import { getAbsoluteImageUrl } from "@/utils/r2-url";
import { GoogleAnalytics } from "@/components/analytics/GoogleAnalytics";

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair",
  display: "swap",
  preload: false,
});

const metadataBase = getBaseUrl();

// Search-specific logo for Google crawlers (white background square)
const searchLogoUrl = getAbsoluteImageUrl("/images/sk-search-logo.jpg", metadataBase);
// Transparent crown logo for site UI & metadata
const crownLogoUrl = getAbsoluteImageUrl("/images/sk-crown-logo.png", metadataBase);

export const metadata: Metadata = {
  metadataBase: new URL(metadataBase),
  title: {
    default: APP_NAME,
    template: `%s | ${APP_NAME}`,
  },
  description: APP_DESCRIPTION,
  keywords: [
    "Cahaya Silver King",
    "emas batangan",
    "perak batangan",
    "gold bullion",
    "silver bullion",
    "palladium",
    "ISO 9001",
    "QR authenticity verification",
  ],
  icons: {
    icon: [
      { url: "/icon.png?v=2", type: "image/png", sizes: "512x512" },
      { url: "/favicon.ico?v=2", sizes: "32x32" },
    ],
    apple: [
      { url: "/apple-icon.png?v=2", sizes: "180x180", type: "image/png" },
    ],
    shortcut: "/favicon.ico?v=2",
  },
  openGraph: {
    title: APP_NAME,
    description: APP_DESCRIPTION,
    type: "website",
    url: metadataBase,
    siteName: APP_NAME,
    locale: "en_US",
    images: [
      {
        url: searchLogoUrl,
        width: 512,
        height: 512,
        alt: `${APP_NAME} Logo`,
        type: "image/jpeg",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: APP_NAME,
    description: APP_DESCRIPTION,
    images: [searchLogoUrl],
    creator: "@silverkingofc",
    site: "@silverkingofc",
  },
  verification: {
    google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION || "",
  },
  alternates: {
    canonical: metadataBase,
    languages: {
      en: metadataBase,
      id: `${metadataBase}/id`,
      "x-default": metadataBase,
    },
  },
};

/** Correct scaling + safe areas on all phones (iOS, Android notch/cutout, in-app browsers). */
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#000000",
};

// Geist (next/font via geist package) + Playfair; Tailwind uses --font-geist-sans / --font-playfair.
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${GeistSans.variable} ${playfair.variable}`}>
      <body className={`${GeistSans.className} antialiased`}>
        <GoogleAnalytics />
        {children}
      </body>
    </html>
  );
}
