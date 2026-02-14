import { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { generatePageMetadata } from "@/lib/seo";
import DistributorsPageClient from "./DistributorsPageClient";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "distributors" });

  return generatePageMetadata({
    title: t("title") || "Distributor",
    description:
      t("hero.subtitle") ||
      "Temukan distributor resmi Silver King by CAI di berbagai kota. Produk logam mulia berkualitas dengan verifikasi keaslian QR.",
    path: "/distributors",
    locale,
    keywords: [
      "distributor Silver King",
      "toko emas Silver King",
      "logam mulia Silver King",
      "Silver King Bandung",
      "Silver King Indonesia",
    ],
  });
}

export default function DistributorsPage() {
  return <DistributorsPageClient />;
}
