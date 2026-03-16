import { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { generatePageMetadata } from "@/lib/seo";
import JournalPageClient from "./JournalPageClient";

/** Same path as Distributor (public/images/DSC02998.JPG) — konsistensi yang berhasil; hero pasti muncul, CMS can override via pageSections. */
const JOURNAL_HERO_IMAGE_PATH = "/images/DSC02998.JPG";

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
  return <JournalPageClient initialHeroImageUrl={JOURNAL_HERO_IMAGE_PATH} />;
}
