import { Metadata } from 'next';
import { getBaseUrl, APP_NAME, APP_DESCRIPTION } from '@/utils/constants';
import { getAbsoluteImageUrl } from '@/utils/r2-url';
import { routing } from '@/i18n/routing';

const baseUrl = getBaseUrl();
const searchLogoUrl = getAbsoluteImageUrl('/images/sk-search-logo.jpg', baseUrl);
const crownLogoUrl = getAbsoluteImageUrl('/images/sk-crown-logo.png', baseUrl);

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
      languages: {
        ...Object.fromEntries(
          routing.locales.map((loc) => [
            loc,
            loc === routing.defaultLocale
              ? `${baseUrl}${path}`
              : `${baseUrl}/${loc}${path}`,
          ])
        ),
        'x-default': `${baseUrl}${path}`,
      },
    },
    openGraph: {
      type: 'website',
      locale: locale === 'id' ? 'id_ID' : 'en_US',
      url: canonicalUrl,
      title: fullTitle,
      description,
      siteName: APP_NAME,
      images: [
        {
          url: searchLogoUrl,
          width: 512,
          height: 512,
          alt: `${APP_NAME} - ${title}`,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: fullTitle,
      description,
      images: [searchLogoUrl],
      creator: '@silverkingofc',
      site: '@silverkingofc',
    },
    verification: {
      google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION || '',
    },
  };
}

