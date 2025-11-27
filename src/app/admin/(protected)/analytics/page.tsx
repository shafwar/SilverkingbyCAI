"use client";

import { useTranslations } from "next-intl";
import { StatsHeader } from "@/components/admin/StatsHeader";
import { AnalyticsPanel } from "@/components/admin/AnalyticsPanel";

export default function AnalyticsPage() {
  const t = useTranslations('admin.analytics');

  return (
    <div className="space-y-4 sm:space-y-6 md:space-y-8">
      <StatsHeader
        eyebrow={t('eyebrow')}
        title={t('title')}
        description={t('description')}
      />
      <AnalyticsPanel />
    </div>
  );
}


