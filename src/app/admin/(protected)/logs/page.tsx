"use client";

import { useTranslations } from "next-intl";
import { StatsHeader } from "@/components/admin/StatsHeader";
import { LogsTable } from "@/components/admin/LogsTable";

export default function LogsPage() {
  const t = useTranslations("admin.analytics");

  return (
    <div className="space-y-8">
      <StatsHeader
        eyebrow={t("logsEyebrow")}
        title={t("logsTitle")}
        description={t("logsDescription")}
      />
      <LogsTable />
    </div>
  );
}
