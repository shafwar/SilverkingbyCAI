import { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getPublicUrl } from "@/lib/r2-client";
import { StructuredData } from "@/components/seo/StructuredData";
import { generatePageMetadata } from "@/lib/seo";
import JournalArticleClient from "./JournalArticleClient";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ locale: string; slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params;
  const t = await getTranslations({ locale, namespace: "journal" });
  try {
    const row = await prisma.journal.findUnique({
      where: { slug: slug.trim() },
      select: { titleId: true, titleEn: true, excerptId: true, excerptEn: true },
    });
    if (!row) return {};
    const title = locale === "id" ? row.titleId : row.titleEn;
    const description = (locale === "id" ? row.excerptId : row.excerptEn)?.trim() || t("meta.description");

    return generatePageMetadata({
      title: title || t("meta.title"),
      description: description || "Artikel resmi dan wawasan industri dari Cahaya Silver King.",
      path: `/journal/${slug.trim()}`,
      locale,
      keywords: [
        "journal",
        "Cahaya Silver King",
        "edukasi emas",
        "investasi logam mulia",
      ],
    });
  } catch {
    return {};
  }
}

export default async function JournalArticlePage({ params }: Props) {
  const { locale, slug } = await params;
  const t = await getTranslations({ locale, namespace: "journal" });
  const lang = locale === "id" ? "id" : "en";

  const row = await prisma.journal.findUnique({
    where: { slug: slug.trim() },
  });

  if (!row) notFound();

  const displayDate = (row.articleDate ?? row.publishedAt)?.toISOString() ?? null;
  const title = lang === "id" ? row.titleId : row.titleEn;
  const excerpt = (lang === "id" ? row.excerptId : row.excerptEn)?.trim() || null;
  const heroImageUrl = row.heroImageR2Key ? getPublicUrl(row.heroImageR2Key) : null;

  const article = {
    slug: row.slug,
    title,
    content: lang === "id" ? row.contentId : row.contentEn,
    excerpt,
    heroImageUrl,
    publishedAt: row.publishedAt?.toISOString() ?? null,
    displayDate,
  };

  const breadcrumbs = [
    { name: "Home", url: locale === "en" ? "/" : `/${locale}` },
    { name: locale === "id" ? "Jurnal" : "Journal", url: locale === "en" ? "/journal" : `/${locale}/journal` },
    { name: title, url: locale === "en" ? `/journal/${row.slug}` : `/${locale}/journal/${row.slug}` },
  ];

  return (
    <>
      <StructuredData
        type="Article"
        breadcrumbs={breadcrumbs}
        locale={locale}
        article={{
          headline: title,
          description: excerpt || title,
          image: heroImageUrl || undefined,
          datePublished: row.publishedAt?.toISOString() || undefined,
          dateModified: row.updatedAt?.toISOString() || undefined,
          url: `/journal/${row.slug}`,
        }}
      />
      <JournalArticleClient
        article={article}
        locale={locale}
        backLabel={t("backToJournal")}
      />
    </>
  );
}
