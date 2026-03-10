"use client";

import { useTranslations } from "next-intl";
import { AdminPageLayout } from "@/components/admin/AdminPageLayout";
import { FeedbackTable } from "@/components/admin/FeedbackTable";

export default function FeedbackPage() {
  const t = useTranslations("admin.feedback");

  return (
    <AdminPageLayout
      eyebrow={t("eyebrow")}
      title={t("title")}
      description={t("description")}
    >
      <div className="space-y-4 sm:space-y-6">
        <FeedbackTable />
      </div>
    </AdminPageLayout>
  );
}
