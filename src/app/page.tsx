import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";
import { routing } from "@/i18n/routing";
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

  // Add error handling for getMessages to prevent 502 errors
  let messages;
  try {
    messages = await getMessages({ locale });
  } catch (error) {
    console.error("[RootPage] Error loading messages:", error);
    // Fallback to empty messages object to prevent crash
    messages = {};
  }

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
