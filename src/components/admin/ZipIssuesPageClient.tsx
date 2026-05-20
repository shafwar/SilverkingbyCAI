"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import type { SerticardZipRenderIssue } from "@prisma/client";

type StatusFilter = "open" | "all";

function formatReasons(reasons: unknown): string {
  if (reasons == null) return "—";
  if (Array.isArray(reasons)) {
    return reasons.map((r) => (typeof r === "string" ? r : JSON.stringify(r))).join(", ");
  }
  if (typeof reasons === "object") return JSON.stringify(reasons);
  return String(reasons);
}

function canRetrySinglePdf(row: SerticardZipRenderIssue): boolean {
  const name = row.productName?.trim() ?? "";
  const serial = row.serialCode?.trim().toUpperCase() ?? "";
  if (!name || !serial || serial === "UNKNOWN") return false;
  if (serial.length < 3) return false;
  return true;
}

export function ZipIssuesPageClient() {
  const t = useTranslations("admin.zipIssues");
  const [status, setStatus] = useState<StatusFilter>("open");
  const [issues, setIssues] = useState<SerticardZipRenderIssue[]>([]);
  const [openCount, setOpenCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [retryingId, setRetryingId] = useState<number | null>(null);
  const [dismissingId, setDismissingId] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const q = new URLSearchParams({ status, limit: "200" });
      const res = await fetch(`/api/admin/serticard-zip-issues?${q}`, { cache: "no-store" });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || `HTTP ${res.status}`);
      }
      const data = (await res.json()) as { openCount?: number; issues?: SerticardZipRenderIssue[] };
      setOpenCount(typeof data.openCount === "number" ? data.openCount : 0);
      setIssues(Array.isArray(data.issues) ? data.issues : []);
    } catch (e) {
      console.error(e);
      toast.error(t("loadError"));
    } finally {
      setLoading(false);
    }
  }, [status, t]);

  useEffect(() => {
    void load();
  }, [load]);

  const emptyMessage = useMemo(
    () => (status === "open" ? t("emptyOpen") : t("emptyAll")),
    [status, t]
  );

  const handleDismiss = async (id: number) => {
    setDismissingId(id);
    try {
      const res = await fetch(`/api/admin/serticard-zip-issues/${id}/dismiss`, { method: "PATCH" });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error((j as { error?: string }).error || `HTTP ${res.status}`);
      }
      toast.success(t("dismissOk"));
      await load();
    } catch (e) {
      console.error(e);
      toast.error(t("dismissFailed"));
    } finally {
      setDismissingId(null);
    }
  };

  const handleRetryPdf = async (row: SerticardZipRenderIssue) => {
    if (!canRetrySinglePdf(row)) {
      toast.error(t("retryInvalid"));
      return;
    }
    setRetryingId(row.id);
    try {
      const body: Record<string, unknown> = {
        product: {
          id: row.productId ?? undefined,
          name: row.productName!.trim(),
          serialCode: row.serialCode.trim().toUpperCase(),
          weight: row.weight,
          isGram: row.isGram,
          ...(row.rootKey?.trim() ? { rootKey: row.rootKey.trim() } : {}),
        },
        templateVariant: row.templateVariant || "01",
        useCustomTemplate: row.useCustomTemplate,
        includeRootKey: row.includeRootKey !== false,
      };
      if (row.cmsTemplateId != null && row.cmsTemplateId > 0) {
        body.cmsTemplateId = row.cmsTemplateId;
      }

      const res = await fetch("/api/qr/download-single-pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const text = await res.text();
        let msg = text;
        try {
          const j = JSON.parse(text) as { error?: string };
          if (j?.error) msg = j.error;
        } catch {
          // ignore
        }
        throw new Error(msg || `HTTP ${res.status}`);
      }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      const safeName = row.productName!
        .trim()
        .replace(/\s+/g, "-")
        .replace(/[^a-zA-Z0-9-]/g, "")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "");
      link.download = `QR-${row.serialCode.trim().toUpperCase()}${safeName ? `-${safeName}` : ""}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      toast.success(t("retryOk"));
    } catch (e) {
      console.error(e);
      toast.error(e instanceof Error ? e.message : t("retryFailed"));
    } finally {
      setRetryingId(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-white/40">{t("eyebrow")}</p>
          <h2 className="text-lg font-semibold text-white">{t("title")}</h2>
          <p className="mt-1 text-xs text-white/50">{t("lead")}</p>
          <p className="mt-1 text-xs text-amber-200/80">{t("openCountLabel", { count: openCount })}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as StatusFilter)}
            className="rounded-lg border border-white/15 bg-black/40 px-3 py-2 text-xs text-white"
            aria-label={t("filterAria")}
          >
            <option value="open">{t("filterOpen")}</option>
            <option value="all">{t("filterAll")}</option>
          </select>
          <button
            type="button"
            onClick={() => void load()}
            disabled={loading}
            className="rounded-lg border border-white/20 bg-white/5 px-3 py-2 text-xs font-medium text-white transition hover:bg-white/10 disabled:opacity-50"
          >
            {loading ? t("refreshing") : t("refresh")}
          </button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-white/10 bg-black/25">
        <table className="min-w-full divide-y divide-white/10 text-left text-xs text-white/90">
          <thead className="bg-white/[0.04] text-[10px] uppercase tracking-wider text-white/45">
            <tr>
              <th className="whitespace-nowrap px-3 py-2.5">{t("colDate")}</th>
              <th className="whitespace-nowrap px-3 py-2.5">{t("colSource")}</th>
              <th className="whitespace-nowrap px-3 py-2.5">{t("colSerial")}</th>
              <th className="min-w-[120px] px-3 py-2.5">{t("colName")}</th>
              <th className="min-w-[160px] px-3 py-2.5">{t("colReasons")}</th>
              <th className="whitespace-nowrap px-3 py-2.5">{t("colTemplate")}</th>
              <th className="whitespace-nowrap px-3 py-2.5">{t("colJob")}</th>
              <th className="whitespace-nowrap px-3 py-2.5 text-right">{t("colActions")}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.06]">
            {loading && issues.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-3 py-8 text-center text-white/45">
                  {t("loading")}
                </td>
              </tr>
            ) : issues.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-3 py-8 text-center text-white/45">
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              issues.map((row) => (
                <tr key={row.id} className="hover:bg-white/[0.03]">
                  <td className="whitespace-nowrap px-3 py-2 text-white/60">
                    {new Date(row.createdAt).toLocaleString()}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 font-mono text-[10px] text-white/70">{row.source}</td>
                  <td className="whitespace-nowrap px-3 py-2 font-mono text-[10px]">{row.serialCode}</td>
                  <td className="px-3 py-2 text-white/80">{row.productName ?? "—"}</td>
                  <td className="max-w-[240px] truncate px-3 py-2 text-white/55" title={formatReasons(row.reasons)}>
                    {formatReasons(row.reasons)}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 text-white/55">
                    {row.cmsTemplateId != null && row.cmsTemplateId > 0
                      ? `cms:${row.cmsTemplateId}`
                      : row.templateVariant}
                    {row.useCustomTemplate ? " · custom" : ""}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 text-white/50">{row.jobId ?? "—"}</td>
                  <td className="whitespace-nowrap px-3 py-2 text-right">
                    <div className="flex flex-wrap justify-end gap-1.5">
                      <button
                        type="button"
                        disabled={retryingId === row.id || !canRetrySinglePdf(row)}
                        title={!canRetrySinglePdf(row) ? t("retryDisabledHint") : undefined}
                        onClick={() => void handleRetryPdf(row)}
                        className="rounded-md border border-sky-500/40 bg-sky-500/15 px-2 py-1 text-[10px] font-semibold text-sky-100 transition hover:bg-sky-500/25 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        {retryingId === row.id ? t("retrying") : t("retryPdf")}
                      </button>
                      {!row.dismissedAt ? (
                        <button
                          type="button"
                          disabled={dismissingId === row.id}
                          onClick={() => void handleDismiss(row.id)}
                          className="rounded-md border border-white/15 bg-white/5 px-2 py-1 text-[10px] font-medium text-white/80 transition hover:bg-white/10 disabled:opacity-50"
                        >
                          {dismissingId === row.id ? t("dismissing") : t("dismiss")}
                        </button>
                      ) : (
                        <span className="text-[10px] text-white/35">{t("dismissed")}</span>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
