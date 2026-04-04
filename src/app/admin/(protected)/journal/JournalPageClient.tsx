"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations, useLocale } from "next-intl";
import { AdminPageLayout } from "@/components/admin/AdminPageLayout";
import { Plus, Pencil, Trash2, ExternalLink } from "lucide-react";

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
      actions={
        <Link
          href="/admin/journal/new"
          className="inline-flex items-center gap-2 rounded-lg bg-luxury-gold/90 px-4 py-2 text-sm font-semibold text-black hover:bg-luxury-gold"
        >
          <Plus className="h-4 w-4" />
          {t("newPost")}
        </Link>
      }
    >
      <div className="space-y-4">
        {loading ? (
          <p className="text-white/50">Loading…</p>
        ) : items.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-6 py-12 text-center text-white/50">
            {t("noPosts")}
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-white/10 bg-white/[0.02] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead>
                <tr className="border-b border-white/10 bg-black/40">
                  <th className="px-4 py-3.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-white/45">
                    {t("dateColumn")}
                  </th>
                  <th className="px-4 py-3.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-white/45">
                    {t("titleLabel")}
                  </th>
                  <th className="px-4 py-3.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-white/45">
                    {t("status")}
                  </th>
                  <th className="px-4 py-3.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-white/45">
                    {t("articleLinkColumn")}
                  </th>
                  <th className="px-4 py-3.5 text-right text-[10px] font-semibold uppercase tracking-[0.14em] text-white/45">
                    {t("actions")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {items.map((row, i) => (
                  <tr
                    key={row.id}
                    className={[
                      "border-b border-white/[0.06] transition-colors hover:bg-white/[0.04]",
                      i % 2 === 1 ? "bg-black/20" : "",
                    ].join(" ")}
                  >
                    <td className="whitespace-nowrap px-4 py-3.5 text-white/80 tabular-nums">
                      {formatTableDate(displayDateIso(row), locale)}
                    </td>
                    <td className="max-w-[280px] px-4 py-3.5">
                      <p className="truncate font-medium text-white">{row.titleEn || row.titleId}</p>
                      {row.titleEn && row.titleId && row.titleEn !== row.titleId ? (
                        <p className="mt-0.5 truncate text-xs text-white/45">{row.titleId}</p>
                      ) : null}
                    </td>
                    <td className="px-4 py-3.5">
                      {row.publishedAt ? (
                        <span className="inline-flex rounded-full border border-emerald-500/25 bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-medium text-emerald-400">
                          {t("published")}
                        </span>
                      ) : (
                        <span className="inline-flex rounded-full border border-white/10 bg-white/5 px-2.5 py-0.5 text-[11px] font-medium text-white/45">
                          {t("draft")}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3.5">
                      <a
                        href={`${origin}/journal/${row.slug}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs text-luxury-gold/90 hover:text-luxury-gold"
                      >
                        <ExternalLink className="h-3.5 w-3.5 shrink-0 opacity-80" />
                        <span className="max-w-[140px] truncate font-mono text-[11px] text-white/55">/journal/{row.slug}</span>
                      </a>
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <Link
                        href={`/admin/journal/${row.id}/edit`}
                        className="mr-1 inline-flex rounded-lg p-2 text-white/55 transition hover:bg-white/10 hover:text-white"
                        aria-label={t("editPost")}
                        title={t("editPost")}
                      >
                        <Pencil className="h-4 w-4" />
                      </Link>
                      <button
                        type="button"
                        onClick={() => handleDelete(row.id)}
                        disabled={deletingId === row.id}
                        className="inline-flex rounded-lg p-2 text-white/55 transition hover:bg-red-500/15 hover:text-red-300 disabled:opacity-40"
                        aria-label={t("deletePost")}
                        title={t("deletePost")}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AdminPageLayout>
  );
}
