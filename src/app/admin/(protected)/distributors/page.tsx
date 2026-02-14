"use client";

import { useTranslations } from "next-intl";
import { StatsHeader } from "@/components/admin/StatsHeader";
import { DistributorPanel } from "@/components/admin/DistributorPanel";

export default function DistributorsAdminPage() {
  const t = useTranslations("admin.distributors");

  return (
    <div className="space-y-6 sm:space-y-8">
      <StatsHeader eyebrow={t("eyebrow")} title={t("title")} description={t("description")} />
      <DistributorPanel />
    </div>
  );
}
