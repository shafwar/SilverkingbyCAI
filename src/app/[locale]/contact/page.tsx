import { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { generatePageMetadata } from "@/lib/seo";
import ContactPageClient from "./ContactPageClient";

export async function generateMetadata({
  params,
}: {
  params: { locale: string };
}): Promise<Metadata> {
  const { locale } = params;
  const t = await getTranslations({ locale, namespace: "contact" });

  return generatePageMetadata({
    title: t("title") || "Contact Us",
    description:
      t("description") ||
      "Get in touch with Silver King by CAI. Send us a message and we'll respond as soon as possible.",
    path: "/contact",
    locale,
    keywords: [
      "contact Silver King",
      "customer service",
      "precious metals inquiry",
      "support",
      "get in touch",
    ],
  });
}

export default function ContactPage() {
  return <ContactPageClient />;
}
