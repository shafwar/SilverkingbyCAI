import { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { generatePageMetadata } from "@/lib/seo";
import JournalPageClient from "./JournalPageClient";

/** Fallback hero for Journal when CMS media is not set. */
const JOURNAL_HERO_FALLBACK = {
  type: "VIDEO" as const,
  // Use the bundled lightweight hero video (local public asset).
  url: "/videos/hero/Jurnal%20Silverking.mp4",
};

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "journal" });

  return generatePageMetadata({
    title: t("meta.title"),
    description: t("meta.description"),
    path: "/journal",
    locale,
    keywords: ["journal", "artikel", "berita", "edukasi", "Silver King"],
  });
}

export default async function JournalPage() {
  return (
    <JournalPageClient
      initialHeroMediaType={JOURNAL_HERO_FALLBACK.type}
      initialHeroUrl={JOURNAL_HERO_FALLBACK.url}
    />
  );
}
