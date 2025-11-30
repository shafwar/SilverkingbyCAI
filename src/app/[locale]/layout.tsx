import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";
import { notFound } from "next/navigation";
import { routing } from "@/i18n/routing";
import { GeistSans } from "geist/font/sans";
import { Playfair_Display } from "next/font/google";
import "@/styles/globals.css";
import { Providers } from "../providers";
import { NavigationTransitionProvider } from "@/components/layout/NavigationTransitionProvider";
import { PageTransitionOverlay } from "@/components/layout/PageTransitionOverlay";
import Navbar from "@/components/layout/Navbar";
import { PagePrefetchClient } from "@/components/layout/PagePrefetchClient";

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair",
  display: "swap",
  preload: true,
});

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  // Ensure that the incoming `locale` is valid
  if (!routing.locales.includes(locale as any)) {
    notFound();
  }

  // Providing all messages to the client
  // side is the easiest way to get started
  // Add error handling to prevent 502 errors
  let messages;
  try {
    messages = await getMessages({ locale });
  } catch (error) {
    console.error(`[LocaleLayout] Error loading messages for locale "${locale}":`, error);
    // Fallback to empty messages object to prevent crash
    messages = {};
  }

  return (
    <html lang={locale} className={`${GeistSans.variable} ${playfair.variable}`}>
      <body className={`${GeistSans.className} antialiased`}>
        <NextIntlClientProvider messages={messages}>
          <NavigationTransitionProvider>
            <Providers>
              <PagePrefetchClient />
              <Navbar />
              {children}
            </Providers>
            <PageTransitionOverlay />
          </NavigationTransitionProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
