import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { routing } from '@/i18n/routing';
import { GeistSans } from "geist/font/sans";
import { Playfair_Display } from "next/font/google";
import "@/styles/globals.css";
import { Providers } from "./providers";
import { NavigationTransitionProvider } from "@/components/layout/NavigationTransitionProvider";
import { PageTransitionOverlay } from "@/components/layout/PageTransitionOverlay";
import RootPageContent from "./RootPageContent";

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair",
  display: "swap",
  preload: true,
});

// Root page - uses default locale without prefix
export default async function RootPage() {
  const locale = routing.defaultLocale;
  const messages = await getMessages({ locale });

  return (
    <NextIntlClientProvider messages={messages}>
      <NavigationTransitionProvider>
        <Providers>
          <RootPageContent />
        </Providers>
        <PageTransitionOverlay />
      </NavigationTransitionProvider>
    </NextIntlClientProvider>
  );
}

