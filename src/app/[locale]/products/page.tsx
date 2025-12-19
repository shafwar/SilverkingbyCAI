import { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { generatePageMetadata } from "@/lib/seo";
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
      t("hero.subtitle") ||
      "Investment-grade bars crafted with uncompromising precision and verified authenticity.",
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

export default function ProductsPage() {
  return <ProductsPageClient />;
}
