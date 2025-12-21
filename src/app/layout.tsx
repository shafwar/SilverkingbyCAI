import type { Metadata } from "next";
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
  preload: true,
});

const metadataBase = getBaseUrl();

// Get absolute URL for logo (ensures Google can access it)
const logoUrl = getAbsoluteImageUrl("/images/cai-logo.png", metadataBase);

export const metadata: Metadata = {
  metadataBase: new URL(metadataBase),
  title: APP_NAME,
  description: APP_DESCRIPTION,
  keywords: ["silver", "gold", "precious metals", "luxury", "verification", "authenticity"],
  icons: {
    icon: logoUrl,
    apple: logoUrl,
    shortcut: logoUrl,
  },
  openGraph: {
    title: APP_NAME,
    description: APP_DESCRIPTION,
    type: "website",
    url: metadataBase,
    siteName: APP_NAME,
    images: [
      {
        url: logoUrl,
        width: 1200,
        height: 630,
        alt: "CAI Logo - Silver King by CAI",
        type: "image/png",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: APP_NAME,
    description: APP_DESCRIPTION,
    images: [logoUrl],
    creator: "@silverking",
  },
  verification: {
    google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION || "",
  },
  // Additional metadata for better Google indexing
  alternates: {
    canonical: metadataBase,
  },
};

// Root layout - handles root page (/) and admin/API routes
// [locale] routes are handled by [locale]/layout.tsx
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
