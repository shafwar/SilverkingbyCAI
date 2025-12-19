import { Metadata } from 'next';
import { getBaseUrl, APP_NAME, APP_DESCRIPTION } from '@/utils/constants';
import { getR2Url } from '@/utils/r2-url';
import { routing } from '@/i18n/routing';

const baseUrl = getBaseUrl();
const logoUrl = getR2Url('/images/cai-logo.png');

interface PageMetadataOptions {
  title: string;
  description: string;
  path: string;
  locale?: string;
  keywords?: string[];
  noindex?: boolean;
}

export function generatePageMetadata({
  title,
  description,
  path,
  locale = 'en',
  keywords = [],
  noindex = false,
}: PageMetadataOptions): Metadata {
  const fullTitle = `${title} | ${APP_NAME}`;
  const canonicalUrl = locale === routing.defaultLocale
    ? `${baseUrl}${path}`
    : `${baseUrl}/${locale}${path}`;

  const defaultKeywords = [
    'silver',
    'gold',
    'precious metals',
    'luxury',
    'verification',
    'authenticity',
    'QR code',
    'bullion',
    'investment',
    'palladium',
    'ISO 9001',
    'Silver King',
    'CAI',
    'Cahaya Silver King',
  ];

  const allKeywords = [...new Set([...defaultKeywords, ...keywords])];

  return {
    title: fullTitle,
    description,
    keywords: allKeywords,
    authors: [{ name: APP_NAME }],
    creator: APP_NAME,
    publisher: APP_NAME,
    robots: noindex
      ? {
          index: false,
          follow: false,
        }
      : {
          index: true,
          follow: true,
          googleBot: {
            index: true,
            follow: true,
            'max-video-preview': -1,
            'max-image-preview': 'large',
            'max-snippet': -1,
          },
        },
    alternates: {
      canonical: canonicalUrl,
      languages: Object.fromEntries(
        routing.locales.map((loc) => [
          loc,
          loc === routing.defaultLocale
            ? `${baseUrl}${path}`
            : `${baseUrl}/${loc}${path}`,
        ])
      ),
    },
    openGraph: {
      type: 'website',
      locale: locale,
      url: canonicalUrl,
      title: fullTitle,
      description,
      siteName: APP_NAME,
      images: [
        {
          url: logoUrl,
          width: 1200,
          height: 630,
          alt: `${APP_NAME} - ${title}`,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: fullTitle,
      description,
      images: [logoUrl],
      creator: '@silverking',
    },
    verification: {
      google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION || '',
    },
  };
}

