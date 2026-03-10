"use client";

import { useTranslations } from "next-intl";
import { AdminPageLayout } from "@/components/admin/AdminPageLayout";
import { AnalyticsPanel } from "@/components/admin/AnalyticsPanel";

export default function AnalyticsPage() {
  const t = useTranslations("admin.analytics");

  return (
    <AdminPageLayout
      eyebrow={t("eyebrow")}
      title={t("title")}
      description={t("description")}
    >
      <div className="space-y-4 sm:space-y-6 md:space-y-8">
        <AnalyticsPanel />
      </div>
    </AdminPageLayout>
  );
}
