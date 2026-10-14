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

  const isIndonesian = locale === 'id';
  const localizedPath = (p: string) => isIndonesian ? `${baseUrl}/id${p}` : `${baseUrl}${p}`;

  const siteNavigationSchema = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: isIndonesian ? 'Navigasi Resmi Silver King' : 'Official Silver King Navigation',
    itemListElement: isIndonesian
      ? [
          {
            '@type': 'SiteNavigationElement',
            position: 1,
            name: 'Produk',
            description: 'Emas, perak, dan paladium batangan bersertifikat ISO 9001 dengan kode QR terverifikasi.',
            url: localizedPath('/products'),
          },
          {
            '@type': 'SiteNavigationElement',
            position: 2,
            name: 'Tentang Kami',
            description: 'Keunggulan manufaktur logam mulia dengan presisi tanpa kompromi dan autentikasi terverifikasi.',
            url: localizedPath('/about'),
          },
          {
            '@type': 'SiteNavigationElement',
            position: 3,
            name: 'Distributor Resmi',
            description: 'Temukan mitra distributor resmi Silver King di berbagai kota untuk bullion asli.',
            url: localizedPath('/distributor'),
          },
          {
            '@type': 'SiteNavigationElement',
            position: 4,
            name: 'Keaslian & Verifikasi QR',
            description: 'Sistem verifikasi QR instan dan jaminan kemurnian bersertifikat ISO 9001.',
            url: localizedPath('/authenticity'),
          },
          {
            '@type': 'SiteNavigationElement',
            position: 5,
            name: 'Layanan Manufaktur',
            description: 'Fabrikasi logam mulia, pencetakan batangan khusus, dan uji kemurnian laboratorium presisi.',
            url: localizedPath('/what-we-do'),
          },
          {
            '@type': 'SiteNavigationElement',
            position: 6,
            name: 'Hubungi Kami',
            description: 'Layanan pelanggan, kerja sama korporat, dan dukungan resmi produk Silver King.',
            url: localizedPath('/contact'),
          },
          {
            '@type': 'SiteNavigationElement',
            position: 7,
            name: 'Jurnal',
            description: 'Wawasan pasar, edukasi, dan berita terbaru seputar investasi logam mulia.',
            url: localizedPath('/journal'),
          },
        ]
      : [
          {
            '@type': 'SiteNavigationElement',
            position: 1,
            name: 'Products',
            description: 'Gold, silver, and palladium precious metal bars certified ISO 9001 with verified QR code.',
            url: localizedPath('/products'),
          },
          {
            '@type': 'SiteNavigationElement',
            position: 2,
            name: 'About Us',
            description: 'Crafting excellence in precious metals with uncompromising precision and authentic verification.',
            url: localizedPath('/about'),
          },
          {
            '@type': 'SiteNavigationElement',
            position: 3,
            name: 'Official Distributors',
            description: 'Find Silver King official distributors across various cities for authentic bullion.',
            url: localizedPath('/distributor'),
          },
          {
            '@type': 'SiteNavigationElement',
            position: 4,
            name: 'Authenticity & QR Verification',
            description: 'Instant QR verification system and ISO 9001 certified purity assurance.',
            url: localizedPath('/authenticity'),
          },
          {
            '@type': 'SiteNavigationElement',
            position: 5,
            name: 'What We Do',
            description: 'Precious metals fabrication, custom bar manufacturing, and advanced purity assaying.',
            url: localizedPath('/what-we-do'),
          },
          {
            '@type': 'SiteNavigationElement',
            position: 6,
            name: 'Contact Us',
            description: 'Customer service, corporate inquiries, and official support for Silver King products.',
            url: localizedPath('/contact'),
          },
          {
            '@type': 'SiteNavigationElement',
            position: 7,
            name: 'Journal',
            description: 'Insights, market updates, and educational articles on precious metals investment.',
            url: localizedPath('/journal'),
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

