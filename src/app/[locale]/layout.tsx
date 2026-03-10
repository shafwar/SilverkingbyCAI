import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";
import { notFound } from "next/navigation";
import { routing } from "@/i18n/routing";
import "@/styles/globals.css";
import { Providers } from "../providers";
import { PagePrefetchClient } from "@/components/layout/PagePrefetchClient";
import { PersistentHomeHeroVideo } from "@/components/layout/PersistentHomeHeroVideo";
import { StructuredData } from "@/components/seo/StructuredData";
import { SetDocumentLang } from "@/components/layout/SetDocumentLang";

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

/**
 * Locale layout – wraps all [locale] routes with i18n providers.
 * Does NOT render <html>/<body> (root layout already does that).
 */
export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { locale: string };
}) {
  const { locale } = params;

  if (!routing.locales.includes(locale as any)) {
    notFound();
  }

  let messages;
  try {
    messages = await getMessages({ locale });
  } catch (error) {
    console.error(`[LocaleLayout] Error loading messages for locale "${locale}":`, error);
    messages = {};
  }

  return (
    <NextIntlClientProvider messages={messages}>
      <Providers>
        <SetDocumentLang locale={locale} />
        <StructuredData type="Organization" locale={locale} />
        <PagePrefetchClient />
        <PersistentHomeHeroVideo />
        {children}
      </Providers>
      <div
        id="cms-modal-root"
        className="fixed inset-0 z-[100000] pointer-events-none"
        aria-hidden
      />
    </NextIntlClientProvider>
  );
}
