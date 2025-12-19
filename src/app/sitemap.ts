import { MetadataRoute } from 'next';
import { getBaseUrl } from '@/utils/constants';
import { routing } from '@/i18n/routing';

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = getBaseUrl();
  const currentDate = new Date();

  // Static public pages
  const staticPages = [
    '',
    '/about',
    '/contact',
    '/what-we-do',
    '/products',
    '/authenticity',
  ];

  // Generate sitemap entries for each locale
  const sitemapEntries: MetadataRoute.Sitemap = [];

  // Add root page (default locale)
  sitemapEntries.push({
    url: baseUrl,
    lastModified: currentDate,
    changeFrequency: 'weekly',
    priority: 1.0,
  });

  // Add locale-specific pages
  routing.locales.forEach((locale) => {
    staticPages.forEach((page) => {
      // Skip root page for non-default locales (already handled above)
      if (page === '' && locale !== routing.defaultLocale) {
        return;
      }

      const url = locale === routing.defaultLocale 
        ? `${baseUrl}${page === '' ? '' : page}`
        : `${baseUrl}/${locale}${page}`;

      sitemapEntries.push({
        url,
        lastModified: currentDate,
        changeFrequency: page === '' ? 'weekly' : 'monthly',
        priority: page === '' ? 1.0 : page === '/products' ? 0.9 : 0.8,
        alternates: {
          languages: Object.fromEntries(
            routing.locales.map((loc) => [
              loc,
              loc === routing.defaultLocale
                ? `${baseUrl}${page === '' ? '' : page}`
                : `${baseUrl}/${loc}${page === '' ? '' : page}`,
            ])
          ),
        },
      });
    });
  });

  return sitemapEntries;
}

