import { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { generatePageMetadata } from "@/lib/seo";
import { prisma } from "@/lib/prisma";
import { getR2Url } from "@/utils/r2-url";
import DistributorPageClient from "./DistributorPageClient";

const HERO_IMAGE_PATH = "/images/DSC02998.JPG";

export const dynamic = "force-dynamic";

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

export default async function DistributorPage() {
  let initialDistributors: Array<{
    id: number;
    distributorName: string;
    storeName: string;
    address: string;
    city: string;
    phone: string;
    mapLink: string | null;
    status: string;
  }> = [];
  try {
    const rows = await prisma.distributor.findMany({
      where: { status: "ACTIVE", deletedAt: null },
      orderBy: [{ city: "asc" }, { storeName: "asc" }],
    });
    initialDistributors = rows.map((d) => ({
      id: d.id,
      distributorName: d.distributorName,
      storeName: d.storeName,
      address: d.address,
      city: d.city,
      phone: d.phone,
      mapLink: d.mapLink,
      status: d.status,
    }));
  } catch (e) {
    console.error("[DistributorPage] Failed to load distributors:", e);
  }

  const heroImageUrl = getR2Url(HERO_IMAGE_PATH);
  if (heroImageUrl.startsWith("http")) {
    console.log("[DistributorPage] Hero image URL (R2):", heroImageUrl);
  } else {
    console.log("[DistributorPage] Hero image URL (local):", heroImageUrl);
  }

  return (
    <DistributorPageClient
      initialDistributors={initialDistributors}
      heroImageUrl={heroImageUrl}
    />
  );
}
