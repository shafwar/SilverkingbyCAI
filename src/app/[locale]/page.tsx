import { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { generatePageMetadata } from "@/lib/seo";
import { ServerHeroSeo } from "@/components/seo/ServerHeroSeo";
import HomePageClient from "./HomePageClient";

/** ISR shell lets CDN/origin reuse HTML between rebuilds — client hero still loads from CMS APIs */
export const revalidate = 300;

export async function generateMetadata({
  params,
}: {
  params: { locale: string };
}): Promise<Metadata> {
  const { locale } = params;
  const t = await getTranslations({ locale, namespace: "home" });

  return generatePageMetadata({
    title: t("title") || "Cahaya Silver King",
    description:
      (t("hero.subtitle") || "").replace(/<[^>]+>/g, "").trim() ||
      "Official manufacturer of ISO 9001 certified gold, silver, and palladium bullion bars. Guaranteed 99.99% purity with instant QR code authenticity verification.",
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

export default async function HomePage({ params }: { params: { locale: string } }) {
  const { locale } = params;
  return (
    <>
      <link rel="preload" href="/images/home/home-hero-poster.webp" as="image" fetchPriority="high" />
      <ServerHeroSeo locale={locale} namespace="home" homeHeadlines subtitleKey="hero.subtitle" taglineKey="" />
      <HomePageClient />
    </>
  );
}
