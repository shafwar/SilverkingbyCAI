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
      t("hero.subtitle") ||
      "Official Silver King by CAI merchandise — Polo, Knitware, T-Shirts & Caps.",
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
