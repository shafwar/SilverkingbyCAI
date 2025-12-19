import { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { generatePageMetadata } from "@/lib/seo";
import AboutPageClient from "./AboutPageClient";

export async function generateMetadata({
  params,
}: {
  params: { locale: string };
}): Promise<Metadata> {
  const { locale } = params;
  const t = await getTranslations({ locale, namespace: "about" });

  return generatePageMetadata({
    title: t("title") || "About Us",
    description:
      t("hero.subtitle") ||
      "Crafting excellence in precious metals since 2024 with uncompromising precision and ground-breaking verification technology.",
    path: "/about",
    locale,
    keywords: [
      "about Silver King",
      "precious metals manufacturer",
      "ISO 9001 certified",
      "company history",
      "quality assurance",
      "craftsmanship",
    ],
  });
}

export default function AboutPage() {
  return <AboutPageClient />;
}
