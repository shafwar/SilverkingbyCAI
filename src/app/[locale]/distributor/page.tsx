import { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { generatePageMetadata } from "@/lib/seo";
import DistributorPageClient from "./DistributorPageClient";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "distributor" });

  return generatePageMetadata({
    title: t("meta.title"),
    description: t("meta.description"),
    path: "/distributor",
    locale,
    keywords: [
      "distributor resmi",
      "official distributor",
      "Silver King",
      "logam mulia",
      "precious metals",
    ],
  });
}

export default function DistributorPage() {
  return <DistributorPageClient />;
}
