import { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { generatePageMetadata } from "@/lib/seo";
import { ServerHeroSeo } from "@/components/seo/ServerHeroSeo";
import AuthenticityPageClient from "./AuthenticityPageClient";

export async function generateMetadata({
  params,
}: {
  params: { locale: string };
}): Promise<Metadata> {
  const { locale } = params;
  const t = await getTranslations({ locale, namespace: "authenticity" });

  return generatePageMetadata({
    title: t("title") || "Authenticity Verification",
    description:
      t("heroDescription") ||
      "Scan the QR code or enter serial number to verify authenticity and view provenance details",
    path: "/authenticity",
    locale,
    keywords: [
      "QR code verification",
      "authenticity check",
      "product verification",
      "serial number verification",
      "precious metals authentication",
      "anti-counterfeit",
      "traceability",
    ],
  });
}

export default async function AuthenticityPage({ params }: { params: { locale: string } }) {
  const { locale } = params;
  return (
    <>
      <ServerHeroSeo
        locale={locale}
        namespace="authenticity"
        subtitleKey="hero.subtitle"
        titleBoldKey="hero.titleBold"
      />
      <AuthenticityPageClient />
    </>
  );
}
