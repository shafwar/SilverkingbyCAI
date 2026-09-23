import { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { generatePageMetadata } from "@/lib/seo";
import { ServerHeroSeo } from "@/components/seo/ServerHeroSeo";
import { StructuredData } from "@/components/seo/StructuredData";
import { prisma } from "@/lib/prisma";
import ProductsPageClient from "./ProductsPageClient";
import type { ProductWithPricing } from "@/components/ui/ProductCard";

export async function generateMetadata({
  params,
}: {
  params: { locale: string };
}): Promise<Metadata> {
  const { locale } = params;
  const t = await getTranslations({ locale, namespace: "products" });

  const isId = locale === "id";

  return generatePageMetadata({
    title: t("title") || "Products",
    description:
      t("hero.tagline") ||
      (isId
        ? "Katalog produk emas, perak, dan paladium batangan murni berstandar ISO 9001 dengan jaminan kemurnian 99.99% dan verifikasi QR code."
        : "Investment grade precious metal bars. ISO 9001 certified gold, silver, and palladium bullion with verified QR code authenticity."),
    path: "/products",
    locale,
    keywords: [
      "precious metals products",
      "gold bars",
      "silver bars",
      "palladium bars",
      "emas batangan 99.99",
      "perak batangan bersertifikat",
      "investment bars",
      "bullion products",
      "5gr bars",
      "10gr bars",
      "25gr bars",
      "50gr bars",
      "100gr bars",
      "250gr bars",
      "500gr bars",
    ],
  });
}

export default async function ProductsPage({ params }: { params: { locale: string } }) {
  const { locale } = params;

  let initialProducts: ProductWithPricing[] | null = null;
  try {
    const db = prisma as any;
    const rows = await db.cmsProduct.findMany({
      orderBy: { createdAt: "desc" },
    });
    if (rows && rows.length > 0) {
      initialProducts = rows.map((p: any) => ({
        id: p.id,
        name: p.name,
        weight: p.weight,
        price: p.price ?? undefined,
        images: Array.isArray(p.images) ? p.images : typeof p.images === "string" ? JSON.parse(p.images) : [],
        filterCategory: p.filterCategory || "all",
        rangeName: p.rangeName || undefined,
        purity: p.purity || "99.99%",
        category: p.category || "Gold",
        description: p.description || undefined,
        overridesDefault: p.overridesDefault || false,
      }));
    }
  } catch (err) {
    console.warn("[ProductsPage] SSR prefetch fallback:", err);
  }

  const breadcrumbs = [
    { name: "Home", url: locale === "en" ? "/" : `/${locale}` },
    { name: locale === "id" ? "Katalog Produk" : "Products", url: locale === "en" ? "/products" : `/${locale}/products` },
  ];

  return (
    <>
      <link
        rel="preload"
        href="/images/products/products-hero-poster.webp"
        as="image"
        fetchPriority="high"
      />
      <ServerHeroSeo locale={locale} namespace="products" />
      <StructuredData breadcrumbs={breadcrumbs} locale={locale} />
      <ProductsPageClient initialProducts={initialProducts ?? undefined} />
    </>
  );
}
