import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";
import { unstable_cache } from "next/cache";
import { notFound } from "next/navigation";
import { routing } from "@/i18n/routing";
import "@/styles/globals.css";
import { Providers } from "../providers";
import { AdminStatusProvider } from "@/contexts/AdminStatusProvider";
import { StructuredData } from "@/components/seo/StructuredData";
import { SetDocumentLang } from "@/components/layout/SetDocumentLang";

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

const getCachedIntlMessages = unstable_cache(
  async (locale: string) => getMessages({ locale }),
  ["locale-layout-intl-messages-v2"],
  { revalidate: 3600 }
);

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
    messages =
      process.env.NODE_ENV === "development"
        ? await getMessages({ locale })
        : await getCachedIntlMessages(locale);
  } catch (error) {
    console.error(`[LocaleLayout] Error loading messages for locale "${locale}":`, error);
    messages = {};
  }

  return (
    <NextIntlClientProvider messages={messages}>
      <Providers>
        <AdminStatusProvider>
          <SetDocumentLang locale={locale} />
          <StructuredData type="Organization" locale={locale} />
          {children}
        </AdminStatusProvider>
      </Providers>
      <div
        id="cms-modal-root"
        className="fixed inset-0 z-[100000] pointer-events-none"
        aria-hidden
      />
    </NextIntlClientProvider>
  );
}
