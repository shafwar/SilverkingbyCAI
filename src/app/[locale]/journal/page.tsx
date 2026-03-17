import { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { generatePageMetadata } from "@/lib/seo";
import JournalPageClient from "./JournalPageClient";

/** Same-origin API that streams hero from R2 (or public/ fallback); ensures hero asset appears and onLoad fires. */
const JOURNAL_HERO_IMAGE_URL = "/api/hero-image?page=journal";

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
  return <JournalPageClient initialHeroImageUrl={JOURNAL_HERO_IMAGE_URL} />;
}
