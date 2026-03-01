"use client";

import { useTranslations } from "next-intl";
import { AdminPageLayout } from "@/components/admin/AdminPageLayout";
import { LogsTable } from "@/components/admin/LogsTable";

export default function LogsPage() {
  const t = useTranslations("admin.analytics");

  return (
    <AdminPageLayout
      eyebrow={t("logsEyebrow")}
      title={t("logsTitle")}
      description={t("logsDescription")}
    >
      <div className="space-y-4 sm:space-y-6">
        <LogsTable />
      </div>
    </AdminPageLayout>
  );
}
