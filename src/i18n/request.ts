import { getRequestConfig } from 'next-intl/server';
import { routing } from './routing';

// Cache for messages to avoid re-importing on every request
const messageCache = new Map<string, any>();

export default getRequestConfig(async ({ requestLocale }) => {
  // This typically corresponds to the `[locale]` segment
  let locale = await requestLocale;

  // Ensure that a valid locale is used
  if (!locale || !routing.locales.includes(locale as any)) {
    locale = routing.defaultLocale;
  }

  // Check cache first for faster response
  if (messageCache.has(locale)) {
    return {
      locale,
      messages: messageCache.get(locale)
    };
  }

  // Load messages and cache them
  const messages = (await import(`../../messages/${locale}.json`)).default;
  messageCache.set(locale, messages);

  // Preload other locale messages in the background for faster switching
  const otherLocale = locale === 'en' ? 'id' : 'en';
  if (!messageCache.has(otherLocale)) {
    import(`../../messages/${otherLocale}.json`)
      .then((module) => {
        messageCache.set(otherLocale, module.default);
      })
      .catch(() => {
        // Silently fail - will load on demand
      });
  }

  return {
    locale,
    messages
  };
});


