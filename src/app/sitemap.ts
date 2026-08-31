import { MetadataRoute } from 'next';
import { getBaseUrl } from '@/utils/constants';
import { routing } from '@/i18n/routing';
import { prisma } from '@/lib/prisma';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = getBaseUrl();
  const currentDate = new Date();

  // All static public pages with priority & change frequency definitions
  const staticPages: Array<{
    path: string;
    priority: number;
    changeFrequency: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly';
  }> = [
    { path: '', priority: 1.0, changeFrequency: 'weekly' },
    { path: '/products', priority: 0.95, changeFrequency: 'daily' },
    { path: '/journal', priority: 0.9, changeFrequency: 'daily' },
    { path: '/merchandise', priority: 0.85, changeFrequency: 'weekly' },
    { path: '/distributor', priority: 0.85, changeFrequency: 'weekly' },
    { path: '/what-we-do', priority: 0.8, changeFrequency: 'monthly' },
    { path: '/authenticity', priority: 0.85, changeFrequency: 'monthly' },
    { path: '/about', priority: 0.75, changeFrequency: 'monthly' },
    { path: '/contact', priority: 0.8, changeFrequency: 'monthly' },
  ];

  const sitemapEntries: MetadataRoute.Sitemap = [];

  // Generate sitemap entries for each locale across all static pages
  for (const page of staticPages) {
    for (const locale of routing.locales) {
      const url =
        locale === routing.defaultLocale
          ? `${baseUrl}${page.path}`
          : `${baseUrl}/${locale}${page.path}`;

      const enUrl = `${baseUrl}${page.path}`;
      const idUrl = `${baseUrl}/id${page.path}`;

      sitemapEntries.push({
        url,
        lastModified: currentDate,
        changeFrequency: page.changeFrequency,
        priority: locale === routing.defaultLocale ? page.priority : Math.max(0.6, page.priority - 0.05),
        alternates: {
          languages: {
            en: enUrl,
            id: idUrl,
            'x-default': enUrl,
          },
        },
      });
    }
  }

  // Dynamically include published Journal articles from database
  try {
    const articles = await prisma.journal.findMany({
      where: {
        publishedAt: { not: null },
      },
      select: {
        slug: true,
        updatedAt: true,
        publishedAt: true,
      },
      orderBy: { publishedAt: 'desc' },
      take: 100,
    });

    for (const article of articles) {
      const articleDate = article.updatedAt || article.publishedAt || currentDate;
      for (const locale of routing.locales) {
        const url =
          locale === routing.defaultLocale
            ? `${baseUrl}/journal/${article.slug}`
            : `${baseUrl}/${locale}/journal/${article.slug}`;

        const enUrl = `${baseUrl}/journal/${article.slug}`;
        const idUrl = `${baseUrl}/id/journal/${article.slug}`;

        sitemapEntries.push({
          url,
          lastModified: articleDate,
          changeFrequency: 'weekly',
          priority: 0.8,
          alternates: {
            languages: {
              en: enUrl,
              id: idUrl,
              'x-default': enUrl,
            },
          },
        });
      }
    }
  } catch (error) {
    console.warn('[Sitemap] Could not fetch dynamic journal articles for sitemap:', error);
  }

  return sitemapEntries;
}
