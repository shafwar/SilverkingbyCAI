import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";
import { notFound } from "next/navigation";
import { routing } from "@/i18n/routing";
import { GeistSans } from "geist/font/sans";
import { Playfair_Display } from "next/font/google";
import "@/styles/globals.css";
import { Providers } from "../providers";
import Navbar from "@/components/layout/Navbar";
import { PagePrefetchClient } from "@/components/layout/PagePrefetchClient";
import { PersistentHomeHeroVideo } from "@/components/layout/PersistentHomeHeroVideo";
import { StructuredData } from "@/components/seo/StructuredData";
import { GoogleAnalytics } from "@/components/analytics/GoogleAnalytics";

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
  params: { locale: string };
}) {
  const { locale } = params;

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

  // Font: same as root layout — GeistSans.variable + className; content uses font-sans (var(--font-geist-sans))
  return (
    <html lang={locale} className={`${GeistSans.variable} ${playfair.variable}`}>
      <body className={`${GeistSans.className} antialiased overflow-x-hidden`}>
        <GoogleAnalytics />
        <StructuredData type="Organization" locale={locale} />
        <NextIntlClientProvider messages={messages}>
          <Providers>
            <PagePrefetchClient />
            <PersistentHomeHeroVideo />
            <Navbar />
            {children}
          </Providers>
          {/* CMS Replace image/video modal root – same stacking as Home edit video pop-up */}
          <div
            id="cms-modal-root"
            className="fixed inset-0 z-[100000] pointer-events-none"
            aria-hidden
          />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
