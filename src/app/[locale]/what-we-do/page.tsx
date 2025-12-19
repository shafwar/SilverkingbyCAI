import { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { generatePageMetadata } from "@/lib/seo";
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
      t("hero.subtitle") ||
      "From ore selection and purification to serial coding, QR sealing, and verification, we choreograph each step so every bar carries a verifiable story of origin and custody.",
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

export default function WhatWeDoPage() {
  return <WhatWeDoPageClient />;
}
