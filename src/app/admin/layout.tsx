import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { routing } from '@/i18n/routing';
import { cookies } from 'next/headers';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Get locale from cookie or use default
  let locale = routing.defaultLocale;
  let messages = {};
  
  try {
    const cookieStore = await cookies();
    const localeCookie = cookieStore.get('NEXT_LOCALE')?.value;
    locale = (localeCookie && routing.locales.includes(localeCookie as any)) 
      ? (localeCookie as 'en' | 'id')
      : routing.defaultLocale;
    
    // Load messages for the selected locale with error handling
    try {
      messages = await getMessages({ locale });
    } catch (error) {
      console.error(`[AdminLayout] Error loading messages for locale "${locale}":`, error);
      // Fallback to empty messages to prevent crash
      messages = {};
    }
  } catch (error) {
    console.error("[AdminLayout] Error in admin layout:", error);
    // Use default locale and empty messages as fallback
    locale = routing.defaultLocale;
    messages = {};
  }

  return (
    <NextIntlClientProvider messages={messages} locale={locale}>
      {children}
    </NextIntlClientProvider>
  );
}
