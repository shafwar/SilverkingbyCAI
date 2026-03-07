import { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { generatePageMetadata } from "@/lib/seo";
import MerchandisePageClient from "./MerchandisePageClient";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "merchandise" });
  return generatePageMetadata({
    title: t("title") || "Merchandise",
    description:
      [t("hero.subtitle"), t("hero.subtitleProducts"), t("hero.tagline")].filter(Boolean).join(" ") ||
      "Official Silver King by CAI apparel. Polo, Knitware, T-Shirts & Caps. Premium quality, timeless style.",
    path: "/merchandise",
    locale,
    keywords: [
      "merchandise",
      "polo",
      "knitware",
      "t-shirt",
      "cap",
      "Silver King",
      "branded apparel",
    ],
  });
}

export default function MerchandisePage() {
  return <MerchandisePageClient />;
}
