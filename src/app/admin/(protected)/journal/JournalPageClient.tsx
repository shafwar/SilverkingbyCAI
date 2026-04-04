"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations, useLocale } from "next-intl";
import { AdminPageLayout } from "@/components/admin/AdminPageLayout";
import { Plus, Pencil, Trash2, ExternalLink, BookOpen, CalendarDays } from "lucide-react";
import clsx from "clsx";

type JournalItem = {
  id: number;
  slug: string;
  titleId: string;
  titleEn: string;
  articleDate: string | null;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
  sortOrder: number;
};

function displayDateIso(row: JournalItem): string | null {
  return row.articleDate ?? row.publishedAt ?? row.createdAt;
}

function formatTableDate(iso: string | null, locale: string) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(locale === "id" ? "id-ID" : "en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function TableSkeleton() {
  return (
    <div className="overflow-hidden rounded-2xl border border-white/[0.08] bg-gradient-to-b from-white/[0.04] to-transparent p-1">
      <div className="rounded-xl bg-black/40 p-4">
        <div className="mb-4 h-10 animate-pulse rounded-lg bg-white/[0.06]" />
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} className="mb-3 flex gap-4 last:mb-0">
            <div className="h-12 w-24 shrink-0 animate-pulse rounded-lg bg-white/[0.06]" />
            <div className="h-12 flex-1 animate-pulse rounded-lg bg-white/[0.05]" />
            <div className="h-12 w-20 shrink-0 animate-pulse rounded-lg bg-white/[0.06]" />
            <div className="h-12 w-28 shrink-0 animate-pulse rounded-lg bg-white/[0.06]" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function JournalPageClient() {
  const t = useTranslations("admin.journal");
  const locale = useLocale();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [items, setItems] = useState<JournalItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/journal");
      if (!res.ok) return;
      const data = await res.json();
      setItems(Array.isArray(data.items) ? data.items : []);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const wantsNew = searchParams.get("new");
    const editId = searchParams.get("edit");
    if (wantsNew === "1") {
      router.replace("/admin/journal/new");
      return;
    }
    if (editId) {
      const id = parseInt(editId, 10);
      if (!Number.isNaN(id)) router.replace(`/admin/journal/${id}/edit`);
    }
  }, [searchParams, router]);

  const stats = useMemo(() => {
    const published = items.filter((r) => r.publishedAt).length;
    return { total: items.length, published, drafts: items.length - published };
  }, [items]);

  const handleDelete = async (id: number) => {
    if (!confirm(t("deleteConfirm"))) return;
    setDeletingId(id);
    try {
      const res = await fetch(`/api/admin/journal/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Delete failed");
      await load();
    } catch {
      alert(t("deleteFailed"));
    } finally {
      setDeletingId(null);
    }
  };

  const origin = typeof window !== "undefined" ? window.location.origin : "";

  return (
    <AdminPageLayout
      eyebrow="Admin"
      title={t("title")}
      description={t("listDescription")}
      actions={
        <Link
          href="/admin/journal/new"
          className="group inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#e8c547] to-[#c9a227] px-5 py-2.5 text-sm font-semibold text-black shadow-[0_0_24px_-4px_rgba(232,197,71,0.45)] transition hover:brightness-105 hover:shadow-[0_0_28px_-4px_rgba(232,197,71,0.55)] active:scale-[0.98]"
        >
          <Plus className="h-4 w-4 transition-transform group-hover:rotate-90" strokeWidth={2.5} />
          {t("newPost")}
        </Link>
      }
    >
      <div className="space-y-6">
        {loading ? (
          <TableSkeleton />
        ) : items.length === 0 ? (
          <div className="relative overflow-hidden rounded-2xl border border-white/[0.09] bg-gradient-to-br from-white/[0.05] via-black/40 to-black/80 px-6 py-16 text-center sm:px-10 sm:py-20">
            <div
              className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full bg-luxury-gold/[0.07] blur-3xl"
              aria-hidden
            />
            <div
              className="pointer-events-none absolute -bottom-16 -left-16 h-48 w-48 rounded-full bg-luxury-gold/[0.05] blur-3xl"
              aria-hidden
            />
            <div className="relative mx-auto flex max-w-md flex-col items-center">
              <span className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] text-luxury-gold/90 shadow-inner">
                <BookOpen className="h-8 w-8" strokeWidth={1.5} />
              </span>
              <p className="text-lg font-semibold tracking-tight text-white">{t("noPosts")}</p>
              <p className="mt-2 text-sm leading-relaxed text-white/45">{t("emptySubtitle")}</p>
              <Link
                href="/admin/journal/new"
                className="mt-8 inline-flex items-center gap-2 rounded-xl border border-luxury-gold/35 bg-luxury-gold/10 px-5 py-2.5 text-sm font-medium text-luxury-gold transition hover:border-luxury-gold/50 hover:bg-luxury-gold/15"
              >
                <Plus className="h-4 w-4" />
                {t("newPost")}
              </Link>
            </div>
          </div>
        ) : (
          <>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.04] px-3.5 py-1.5 text-xs font-medium text-white/85">
                  <span className="h-1.5 w-1.5 rounded-full bg-luxury-gold" aria-hidden />
                  {t("statsTotal", { count: stats.total })}
                </span>
                <span className="text-white/25" aria-hidden>
                  ·
                </span>
                <span className="text-xs text-emerald-400/90">{t("statsLive", { count: stats.published })}</span>
                <span className="text-xs text-white/30">·</span>
                <span className="text-xs text-white/50">{t("statsDrafts", { count: stats.drafts })}</span>
              </div>
            </div>

            <div className="overflow-hidden rounded-2xl border border-white/[0.08] bg-gradient-to-b from-white/[0.035] to-transparent shadow-[0_24px_48px_-32px_rgba(0,0,0,0.9)]">
              <div className="h-px w-full bg-gradient-to-r from-transparent via-luxury-gold/25 to-transparent" aria-hidden />
              <div className="overflow-x-auto">
                <table className="w-full min-w-[760px] text-left text-[13px]">
                  <thead>
                    <tr className="border-b border-white/[0.07] bg-black/50">
                      <th
                        scope="col"
                        className="whitespace-nowrap px-5 py-4 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/40"
                      >
                        <span className="inline-flex items-center gap-2">
                          <CalendarDays className="h-3.5 w-3.5 text-white/30" aria-hidden />
                          {t("dateColumn")}
                        </span>
                      </th>
                      <th
                        scope="col"
                        className="px-5 py-4 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/40"
                      >
                        {t("titleLabel")}
                      </th>
                      <th
                        scope="col"
                        className="whitespace-nowrap px-5 py-4 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/40"
                      >
                        {t("status")}
                      </th>
                      <th
                        scope="col"
                        className="whitespace-nowrap px-5 py-4 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/40"
                      >
                        {t("articleLinkColumn")}
                      </th>
                      <th
                        scope="col"
                        className="whitespace-nowrap px-5 py-4 text-right text-[10px] font-semibold uppercase tracking-[0.16em] text-white/40"
                      >
                        {t("actions")}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.05]">
                    {items.map((row, i) => (
                      <tr
                        key={row.id}
                        className={clsx(
                          "group transition-colors duration-150",
                          "border-l-2 border-l-transparent hover:border-l-luxury-gold/40 hover:bg-white/[0.03]",
                          i % 2 === 1 ? "bg-black/15" : "bg-transparent"
                        )}
                      >
                        <td className="whitespace-nowrap px-5 py-4 tabular-nums text-white/75">
                          {formatTableDate(displayDateIso(row), locale)}
                        </td>
                        <td className="max-w-[min(320px,40vw)] px-5 py-4">
                          <p className="truncate font-medium leading-snug text-white">{row.titleEn || row.titleId}</p>
                          {row.titleEn && row.titleId && row.titleEn !== row.titleId ? (
                            <p className="mt-1 truncate text-[12px] leading-snug text-white/38">{row.titleId}</p>
                          ) : null}
                        </td>
                        <td className="px-5 py-4">
                          {row.publishedAt ? (
                            <span className="inline-flex items-center rounded-full border border-emerald-400/20 bg-emerald-500/[0.12] px-2.5 py-1 text-[11px] font-semibold tracking-wide text-emerald-300/95">
                              {t("published")}
                            </span>
                          ) : (
                            <span className="inline-flex items-center rounded-full border border-white/[0.1] bg-white/[0.04] px-2.5 py-1 text-[11px] font-medium text-white/45">
                              {t("draft")}
                            </span>
                          )}
                        </td>
                        <td className="px-5 py-4">
                          <a
                            href={`${origin}/journal/${row.slug}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex max-w-full items-center gap-2 rounded-lg border border-white/[0.08] bg-white/[0.03] py-1.5 pl-2.5 pr-3 text-[11px] font-medium text-luxury-gold/95 transition hover:border-luxury-gold/25 hover:bg-luxury-gold/[0.08]"
                          >
                            <ExternalLink className="h-3.5 w-3.5 shrink-0 opacity-70" />
                            <span className="min-w-0 truncate">{t("openLivePage")}</span>
                          </a>
                        </td>
                        <td className="px-5 py-4 text-right">
                          <div className="inline-flex items-center gap-0.5 rounded-xl border border-white/[0.06] bg-black/30 p-0.5">
                            <Link
                              href={`/admin/journal/${row.id}/edit`}
                              className="inline-flex rounded-lg p-2 text-white/55 transition hover:bg-white/10 hover:text-white"
                              aria-label={t("editPost")}
                              title={t("editPost")}
                            >
                              <Pencil className="h-4 w-4" />
                            </Link>
                            <button
                              type="button"
                              onClick={() => handleDelete(row.id)}
                              disabled={deletingId === row.id}
                              className="inline-flex rounded-lg p-2 text-white/55 transition hover:bg-red-500/15 hover:text-red-300 disabled:pointer-events-none disabled:opacity-35"
                              aria-label={t("deletePost")}
                              title={t("deletePost")}
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </AdminPageLayout>
  );
}
