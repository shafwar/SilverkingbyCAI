import { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { generatePageMetadata } from "@/lib/seo";
import { ServerHeroSeo } from "@/components/seo/ServerHeroSeo";
import JournalPageClient from "./JournalPageClient";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "journal" });

  return generatePageMetadata({
    title: t("meta.title") || "Journal",
    description: t("meta.description") || "Updates, news, and education from Silver King",
    path: "/journal",
    locale,
    keywords: ["journal", "artikel", "berita", "edukasi", "Silver King"],
  });
}

export default async function JournalPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  return (
    <>
      <link
        rel="preload"
        href="/images/journal/journal-hero-poster.webp"
        as="image"
        fetchPriority="high"
      />
      <ServerHeroSeo locale={locale} namespace="journal" />
      <JournalPageClient />
    </>
  );
}

