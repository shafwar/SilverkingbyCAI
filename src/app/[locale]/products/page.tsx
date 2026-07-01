import { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { generatePageMetadata } from "@/lib/seo";
import { ServerHeroSeo } from "@/components/seo/ServerHeroSeo";
import ProductsPageClient from "./ProductsPageClient";

export async function generateMetadata({
  params,
}: {
  params: { locale: string };
}): Promise<Metadata> {
  const { locale } = params;
  const t = await getTranslations({ locale, namespace: "products" });

  return generatePageMetadata({
    title: t("title") || "Products",
    description:
      t("hero.tagline") ||
      "Investment grade precious metal bars. Gold, silver, and palladium with verified authenticity.",
    path: "/products",
    locale,
    keywords: [
      "precious metals products",
      "gold bars",
      "silver bars",
      "palladium bars",
      "investment bars",
      "bullion products",
      "5gr bars",
      "10gr bars",
      "25gr bars",
      "50gr bars",
      "100gr bars",
      "250gr bars",
    ],
  });
}

export default async function ProductsPage({ params }: { params: { locale: string } }) {
  const { locale } = params;
  return (
    <>
      <link
        rel="preload"
        href="/images/products/products-hero-poster.webp"
        as="image"
        fetchPriority="high"
      />
      <ServerHeroSeo locale={locale} namespace="products" />
      <ProductsPageClient />
    </>
  );
}
