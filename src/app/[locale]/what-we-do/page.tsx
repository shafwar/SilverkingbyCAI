import { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { generatePageMetadata } from "@/lib/seo";
import { ServerHeroSeo } from "@/components/seo/ServerHeroSeo";
import WhatWeDoPageClient from "./WhatWeDoPageClient";

export async function generateMetadata({
  params,
}: {
  params: { locale: string };
}): Promise<Metadata> {
  const { locale } = params;
  const t = await getTranslations({ locale, namespace: "whatWeDo" });

  return generatePageMetadata({
    title: t("title") || "What We Do",
    description:
      t("hero.tagline") ||
      "The full lifecycle of every Silver King bar — from refining to QR verification.",
    path: "/what-we-do",
    locale,
    keywords: [
      "precious metals manufacturing",
      "gold fabrication",
      "silver refinement",
      "palladium processing",
      "QR code verification",
      "traceability",
      "supply chain",
    ],
  });
}

export default async function WhatWeDoPage({ params }: { params: { locale: string } }) {
  const { locale } = params;
  return (
    <>
      <ServerHeroSeo locale={locale} namespace="whatWeDo" />
      <WhatWeDoPageClient />
    </>
  );
}
