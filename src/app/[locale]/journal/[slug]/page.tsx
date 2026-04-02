import { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getPublicUrl } from "@/lib/r2-client";
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
    const description = locale === "id" ? row.excerptId : row.excerptEn;
    return {
      title: title ?? t("meta.title"),
      description: (description && description.trim()) || t("meta.description"),
      openGraph: { title, description: description ?? undefined },
    };
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

  const article = {
    slug: row.slug,
    title: lang === "id" ? row.titleId : row.titleEn,
    content: lang === "id" ? row.contentId : row.contentEn,
    excerpt: (lang === "id" ? row.excerptId : row.excerptEn)?.trim() || null,
    heroImageUrl: row.heroImageR2Key ? getPublicUrl(row.heroImageR2Key) : null,
    publishedAt: row.publishedAt?.toISOString() ?? null,
  };

  return (
    <JournalArticleClient
      article={article}
      locale={locale}
      backLabel={t("backToJournal")}
    />
  );
}
