import { getBaseUrl, APP_NAME, APP_DESCRIPTION } from '@/utils/constants';
import { getAbsoluteImageUrl } from '@/utils/r2-url';

interface StructuredDataProps {
  type?: 'Organization' | 'Website' | 'BreadcrumbList';
  breadcrumbs?: Array<{ name: string; url: string }>;
  locale?: string;
}

export function StructuredData({ type = 'Organization', breadcrumbs, locale = 'en' }: StructuredDataProps) {
  const baseUrl = getBaseUrl();
  const logoUrl = getAbsoluteImageUrl('/images/cai-logo.png', baseUrl);

  const organizationSchema = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: APP_NAME,
    description: APP_DESCRIPTION,
    url: baseUrl,
    logo: logoUrl,
    sameAs: [
      'https://instagram.com',
      'https://twitter.com',
      'https://linkedin.com',
      'https://youtube.com',
    ],
    contactPoint: {
      '@type': 'ContactPoint',
      contactType: 'Customer Service',
      areaServed: 'ID',
      availableLanguage: ['en', 'id'],
    },
  };

  const websiteSchema = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: APP_NAME,
    description: APP_DESCRIPTION,
    url: baseUrl,
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${baseUrl}/search?q={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
    inLanguage: locale,
  };

  const breadcrumbSchema = breadcrumbs
    ? {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: breadcrumbs.map((crumb, index) => ({
          '@type': 'ListItem',
          position: index + 1,
          name: crumb.name,
          item: crumb.url,
        })),
      }
    : null;

  const schemas = [];
  if (type === 'Organization' || type === 'Website') {
    schemas.push(organizationSchema);
    schemas.push(websiteSchema);
  }
  if (breadcrumbSchema) {
    schemas.push(breadcrumbSchema);
  }

  return (
    <>
      {schemas.map((schema, index) => (
        <script
          key={index}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
        />
      ))}
    </>
  );
}

