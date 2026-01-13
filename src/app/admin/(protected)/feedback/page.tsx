"use client";

import { useTranslations } from "next-intl";
import { StatsHeader } from "@/components/admin/StatsHeader";
import { FeedbackTable } from "@/components/admin/FeedbackTable";

export default function FeedbackPage() {
  const t = useTranslations("admin.feedback");

  return (
    <div className="space-y-8">
      <StatsHeader eyebrow={t("eyebrow")} title={t("title")} description={t("description")} />
      <FeedbackTable />
    </div>
  );
}
