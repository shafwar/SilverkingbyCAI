"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";

export function ZipIssuesBanner() {
  const t = useTranslations("admin.zipIssues");
  const [openCount, setOpenCount] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/admin/serticard-zip-issues?summary=1", { cache: "no-store" });
        if (!res.ok) return;
        const data = (await res.json()) as { openCount?: number };
        if (!cancelled && typeof data.openCount === "number") setOpenCount(data.openCount);
      } catch {
        // ignore
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (openCount == null || openCount < 1) return null;

  return (
    <div className="mb-4 rounded-xl border border-amber-500/35 bg-amber-500/10 px-4 py-3 text-sm text-amber-100/95">
      <p className="font-medium text-amber-50">{t("bannerTitle", { count: openCount })}</p>
      <p className="mt-1 text-xs text-amber-100/80">{t("bannerLead")}</p>
      <Link
        href="/admin/qr-preview/zip-issues"
        className="mt-2 inline-block text-xs font-semibold text-amber-200 underline-offset-2 hover:text-white hover:underline"
      >
        {t("bannerLink")}
      </Link>
    </div>
  );
}
