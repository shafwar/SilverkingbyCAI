import { getBaseUrl, APP_NAME, APP_DESCRIPTION, APP_DESCRIPTION_ID, getSilverKingInstagramUrl, getSilverKingWhatsAppUrl } from '@/utils/constants';
import { getAbsoluteImageUrl } from '@/utils/r2-url';

export interface ProductSchemaItem {
  name: string;
  description: string;
  image?: string;
  sku?: string;
  weight?: string;
  purity?: string;
  category?: string;
}

export interface ArticleSchemaItem {
  headline: string;
  description?: string;
  image?: string;
  datePublished?: string;
  dateModified?: string;
  authorName?: string;
  url: string;
}

interface StructuredDataProps {
  type?: 'Organization' | 'Website' | 'BreadcrumbList' | 'Product' | 'Article';
  breadcrumbs?: Array<{ name: string; url: string }>;
  product?: ProductSchemaItem;
  article?: ArticleSchemaItem;
  locale?: string;
}

export function StructuredData({
  type = 'Organization',
  breadcrumbs,
  product,
  article,
  locale = 'en',
}: StructuredDataProps) {
  const baseUrl = getBaseUrl();
  const searchLogoUrl = getAbsoluteImageUrl('/images/sk-search-logo.jpg', baseUrl);
  const logoUrl = getAbsoluteImageUrl('/images/sk-crown-logo.png', baseUrl);
  const instagramUrl = getSilverKingInstagramUrl();
  const whatsappUrl = getSilverKingWhatsAppUrl();
  const description = locale === 'id' ? APP_DESCRIPTION_ID : APP_DESCRIPTION;

  const organizationSchema = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: APP_NAME,
    alternateName: ['CAI', 'Cahaya Silver King Precious Metals'],
    description: description,
    url: baseUrl,
    logo: searchLogoUrl,
    image: searchLogoUrl,
    sameAs: [
      instagramUrl,
      whatsappUrl,
    ],
    knowsAbout: [
      'Precious Metals Manufacturing',
      'Gold Bullion Fabrication',
      'Silver Bars Fabrication',
      'Palladium Bullion',
      'QR Code Authenticity Verification',
      'ISO 9001 Quality Management',
    ],
    hasCertification: {
      '@type': 'Certification',
      name: 'ISO 9001 Quality Management System',
    },
    contactPoint: {
      '@type': 'ContactPoint',
      contactType: 'Sales and Customer Support',
      telephone: '+62-852-8572-6980',
      areaServed: 'ID',
      availableLanguage: ['Indonesian', 'English'],
    },
  };

  const websiteSchema = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: APP_NAME,
    description: description,
    url: baseUrl,
    inLanguage: locale === 'id' ? 'id-ID' : 'en-US',
  };

  const breadcrumbSchema = breadcrumbs && breadcrumbs.length > 0
    ? {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: breadcrumbs.map((crumb, index) => ({
          '@type': 'ListItem',
          position: index + 1,
          name: crumb.name,
          item: crumb.url.startsWith('http') ? crumb.url : `${baseUrl}${crumb.url}`,
        })),
      }
    : null;

  const productSchema = product
    ? {
        '@context': 'https://schema.org',
        '@type': 'Product',
        name: product.name,
        description: product.description,
        image: product.image ? (product.image.startsWith('http') ? product.image : `${baseUrl}${product.image}`) : logoUrl,
        sku: product.sku || product.name.toLowerCase().replace(/\s+/g, '-'),
        brand: {
          '@type': 'Brand',
          name: APP_NAME,
        },
        manufacturer: {
          '@type': 'Organization',
          name: APP_NAME,
        },
        material: product.category || 'Precious Metal',
        additionalProperty: [
          ...(product.weight ? [{ '@type': 'PropertyValue', name: 'Weight', value: product.weight }] : []),
          ...(product.purity ? [{ '@type': 'PropertyValue', name: 'Purity', value: product.purity }] : [{ '@type': 'PropertyValue', name: 'Purity', value: '99.99%' }]),
          { '@type': 'PropertyValue', name: 'Authenticity', value: 'QR Code Verified' },
          { '@type': 'PropertyValue', name: 'Certification', value: 'ISO 9001' },
        ],
      }
    : null;

  const articleSchema = article
    ? {
        '@context': 'https://schema.org',
        '@type': 'Article',
        headline: article.headline,
        description: article.description || article.headline,
        image: article.image ? (article.image.startsWith('http') ? article.image : `${baseUrl}${article.image}`) : logoUrl,
        datePublished: article.datePublished || new Date().toISOString(),
        dateModified: article.dateModified || article.datePublished || new Date().toISOString(),
        mainEntityOfPage: {
          '@type': 'WebPage',
          '@id': article.url.startsWith('http') ? article.url : `${baseUrl}${article.url}`,
        },
        author: {
          '@type': 'Organization',
          name: article.authorName || APP_NAME,
        },
        publisher: {
          '@type': 'Organization',
          name: APP_NAME,
          logo: {
            '@type': 'ImageObject',
            url: logoUrl,
          },
        },
      }
    : null;

  const siteNavigationSchema = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'Official Silver King Navigation',
    itemListElement: [
      {
        '@type': 'SiteNavigationElement',
        position: 1,
        name: 'Products',
        description: 'Gold, silver, and palladium precious metal bars certified ISO 9001 with verified QR code.',
        url: `${baseUrl}/products`,
      },
      {
        '@type': 'SiteNavigationElement',
        position: 2,
        name: 'About Us',
        description: 'Crafting excellence in precious metals with uncompromising precision and authentic verification.',
        url: `${baseUrl}/about`,
      },
      {
        '@type': 'SiteNavigationElement',
        position: 3,
        name: 'Official Distributors',
        description: 'Find Silver King official distributors across various cities for authentic bullion.',
        url: `${baseUrl}/distributor`,
      },
      {
        '@type': 'SiteNavigationElement',
        position: 4,
        name: 'Authenticity',
        description: 'Instant QR verification system and ISO 9001 certified purity assurance.',
        url: `${baseUrl}/authenticity`,
      },
      {
        '@type': 'SiteNavigationElement',
        position: 5,
        name: 'What We Do',
        description: 'Precious metals fabrication, custom bar manufacturing, and advanced purity assaying.',
        url: `${baseUrl}/what-we-do`,
      },
      {
        '@type': 'SiteNavigationElement',
        position: 6,
        name: 'Contact Us',
        description: 'Customer service, corporate inquiries, and official support for Silver King products.',
        url: `${baseUrl}/contact`,
      },
      {
        '@type': 'SiteNavigationElement',
        position: 7,
        name: 'Journal',
        description: 'Insights, market updates, and educational articles on precious metals investment.',
        url: `${baseUrl}/journal`,
      },
    ],
  };

  const schemas: any[] = [];
  if (type === 'Organization' || type === 'Website') {
    schemas.push(organizationSchema);
    schemas.push(websiteSchema);
    schemas.push(siteNavigationSchema);
  }
  if (breadcrumbSchema) {
    schemas.push(breadcrumbSchema);
  }
  if (productSchema) {
    schemas.push(productSchema);
  }
  if (articleSchema) {
    schemas.push(articleSchema);
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

