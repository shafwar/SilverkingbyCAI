import { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { generatePageMetadata } from "@/lib/seo";
import { ServerHeroSeo } from "@/components/seo/ServerHeroSeo";
import { StructuredData } from "@/components/seo/StructuredData";
import { prisma } from "@/lib/prisma";
import { getPublicUrl } from "@/lib/r2-client";
import JournalPageClient from "./JournalPageClient";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "journal" });

  const isId = locale === "id";

  return generatePageMetadata({
    title: t("meta.title") || "Journal",
    description:
      t("meta.description") ||
      (isId
        ? "Wawasan, analisis industri logam mulia, dan edukasi investasi emas serta perak batangan dari Cahaya Silver King."
        : "Insights, precious metals industry analysis, and gold & silver bullion investment education from Cahaya Silver King."),
    path: "/journal",
    locale,
    keywords: [
      "journal",
      "artikel emas",
      "berita perak",
      "edukasi logam mulia",
      "Cahaya Silver King",
      "investasi emas batangan",
    ],
  });
}

export default async function JournalPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const lang = locale === "id" ? "id" : "en";

  let initialItems: Array<{
    slug: string;
    title: string;
    excerpt: string | null;
    heroImageUrl: string | null;
    publishedAt: string | null;
    displayDate?: string | null;
  }> = [];

  try {
    const rows = await prisma.journal.findMany({
      where: { publishedAt: { not: null } },
      orderBy: [{ sortOrder: "asc" }, { articleDate: "desc" }, { publishedAt: "desc" }],
      take: 20,
    });

    initialItems = rows.map((row) => ({
      slug: row.slug,
      title: lang === "id" ? row.titleId : row.titleEn,
      excerpt: (lang === "id" ? row.excerptId : row.excerptEn)?.trim() || null,
      heroImageUrl: row.heroImageR2Key ? getPublicUrl(row.heroImageR2Key) : null,
      publishedAt: row.publishedAt?.toISOString() ?? null,
      displayDate: (row.articleDate ?? row.publishedAt)?.toISOString() ?? null,
    }));
  } catch (err) {
    console.warn("[JournalPage] SSR prefetch fallback:", err);
  }

  const breadcrumbs = [
    { name: "Home", url: locale === "en" ? "/" : `/${locale}` },
    { name: locale === "id" ? "Jurnal & Edukasi" : "Journal & Insights", url: locale === "en" ? "/journal" : `/${locale}/journal` },
  ];

  return (
    <>
      <link
        rel="preload"
        href="/images/journal/journal-hero-poster.webp"
        as="image"
        fetchPriority="high"
      />
      <ServerHeroSeo locale={locale} namespace="journal" />
      <StructuredData breadcrumbs={breadcrumbs} locale={locale} />
      <JournalPageClient initialItems={initialItems} />
    </>
  );
}
