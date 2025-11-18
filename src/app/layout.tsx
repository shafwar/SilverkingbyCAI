import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { Playfair_Display } from "next/font/google";
import "@/styles/globals.css";
import { APP_NAME, APP_DESCRIPTION } from "@/utils/constants";
import { Providers } from "./providers";
import { NavigationTransitionProvider } from "@/components/layout/NavigationTransitionProvider";
import { PageTransitionOverlay } from "@/components/layout/PageTransitionOverlay";

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair",
  display: "swap",
  preload: true,
});

const metadataBase = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || "https://silverkingbycai-production.up.railway.app";

export const metadata: Metadata = {
  metadataBase: new URL(metadataBase),
  title: APP_NAME,
  description: APP_DESCRIPTION,
  keywords: ["silver", "gold", "precious metals", "luxury", "verification", "authenticity"],
  icons: {
    icon: "/images/cai-logo.png",
    apple: "/images/cai-logo.png",
  },
  openGraph: {
    title: APP_NAME,
    description: APP_DESCRIPTION,
    type: "website",
    images: [
      {
        url: "/images/cai-logo.png",
        width: 1200,
        height: 630,
        alt: "CAI Logo - Silver King by CAI",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: APP_NAME,
    description: APP_DESCRIPTION,
    images: ["/images/cai-logo.png"],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${GeistSans.variable} ${playfair.variable}`}>
      <body className={`${GeistSans.className} antialiased`}>
        <NavigationTransitionProvider>
        <Providers>{children}</Providers>
          <PageTransitionOverlay />
        </NavigationTransitionProvider>
      </body>
    </html>
  );
}
