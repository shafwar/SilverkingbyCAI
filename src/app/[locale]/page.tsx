import { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { generatePageMetadata } from "@/lib/seo";
import HomePageClient from "./HomePageClient";

export async function generateMetadata({
  params,
}: {
  params: { locale: string };
}): Promise<Metadata> {
  const { locale } = params;
  const t = await getTranslations({ locale, namespace: "home" });

  return generatePageMetadata({
    title: t("title") || "Silver King by CAI",
    description:
      t("hero.subtitle") ||
      "Expert manufacturing of gold, silver, and palladium products. Custom bar fabrication, uncompromising purity, and QR-verified authenticity—redefining trust in precious metals.",
    path: "",
    locale,
    keywords: [
      "precious metals",
      "gold bars",
      "silver bars",
      "palladium",
      "bullion",
      "investment",
      "QR verification",
      "authenticity",
    ],
  });
}

export default function HomePage() {
  return <HomePageClient />;
}
