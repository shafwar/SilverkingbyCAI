"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations, useLocale } from "next-intl";
import { AdminPageLayout } from "@/components/admin/AdminPageLayout";
import { JournalRichEditor } from "@/components/admin/journal/JournalRichEditor";
import {
  ArrowLeft,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Upload,
  Link2,
  Calendar,
  ImageIcon,
  Type,
  FileText,
  type LucideIcon,
} from "lucide-react";
import clsx from "clsx";

const FORM_ID = "admin-journal-post-form";

const cardClass =
  "rounded-2xl border border-white/[0.08] bg-gradient-to-b from-white/[0.045] to-white/[0.012] shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]";

const inputClass =
  "w-full rounded-xl border border-white/10 bg-black/35 px-3.5 py-2.5 text-sm text-white placeholder:text-white/25 outline-none transition focus:border-luxury-gold/35 focus:ring-2 focus:ring-luxury-gold/15";

type JournalRow = {
  id: number;
  slug: string;
  titleId: string;
  titleEn: string;
  contentId: string;
  contentEn: string;
  excerptId: string | null;
  excerptEn: string | null;
  heroImageR2Key: string | null;
  articleDate: string | null;
  publishedAt: string | null;
  sortOrder: number;
};

function toDatetimeLocalValue(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function defaultArticleDateLocal(): string {
  return toDatetimeLocalValue(new Date().toISOString());
}

function slugifyPreview(s: string): string {
  return (
    s
      .trim()
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9-]/g, "")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "") || "post"
  );
}

function heroUrlFromKey(r2Key: string | null | undefined): string | null {
  if (!r2Key) return null;
  const base = process.env.NEXT_PUBLIC_R2_PUBLIC_URL?.replace(/\/$/, "");
  if (base) return `${base}/${r2Key}`;
  if (r2Key.startsWith("static/")) return `/${r2Key.slice("static/".length)}`;
  return null;
}

function SectionTitle({ icon: Icon, children }: { icon: LucideIcon; children: React.ReactNode }) {
  return (
    <div className="mb-5 flex items-center gap-3 border-b border-white/[0.07] pb-4">
      <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-luxury-gold/85">
        <Icon className="h-4 w-4" strokeWidth={1.75} />
      </span>
      <h2 className="text-xs font-semibold uppercase tracking-[0.18em] text-white/55">{children}</h2>
    </div>
  );
}

type Props = { mode: "new" | "edit"; postId?: number };

export function JournalPostFormClient({ mode, postId }: Props) {
  const t = useTranslations("admin.journal");
  const locale = useLocale();
  const router = useRouter();
  const [loading, setLoading] = useState(mode === "edit");
  const [saving, setSaving] = useState(false);
  const [uploadingHero, setUploadingHero] = useState(false);
  const [heroZoom, setHeroZoom] = useState(1);
  const [slugSaved, setSlugSaved] = useState<string | null>(null);

  const [titleId, setTitleId] = useState("");
  const [titleEn, setTitleEn] = useState("");
  const [contentId, setContentId] = useState("");
  const [contentEn, setContentEn] = useState("");
  const [excerptId, setExcerptId] = useState("");
  const [excerptEn, setExcerptEn] = useState("");
  const [articleDateLocal, setArticleDateLocal] = useState(defaultArticleDateLocal);
  const [isPublished, setIsPublished] = useState(false);
  const [sortOrder, setSortOrder] = useState(0);
  const [heroImageR2Key, setHeroImageR2Key] = useState<string | null>(null);
  const [heroFile, setHeroFile] = useState<File | null>(null);
  const [heroPreviewUrl, setHeroPreviewUrl] = useState<string | null>(null);

  const slugPreview = useMemo(
    () => slugifyPreview(titleEn || titleId || "post"),
    [titleEn, titleId]
  );

  const publicArticleHref = useMemo(() => {
    const slug = slugSaved ?? slugPreview;
    if (typeof window === "undefined") return `/journal/${slug}`;
    return `${window.location.origin}/journal/${slug}`;
  }, [slugSaved, slugPreview]);

  const backLink = (
    <Link
      href="/admin/journal"
      className="group inline-flex items-center gap-2 rounded-xl border border-white/[0.1] bg-white/[0.04] px-3.5 py-2.5 text-xs font-medium text-white/80 transition hover:border-white/20 hover:bg-white/[0.07] hover:text-white"
    >
      <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" strokeWidth={2} />
      {t("backToList")}
    </Link>
  );

  const applyRow = useCallback((row: JournalRow) => {
    setSlugSaved(row.slug);
    setTitleId(row.titleId);
    setTitleEn(row.titleEn);
    setContentId(row.contentId);
    setContentEn(row.contentEn);
    setExcerptId(row.excerptId ?? "");
    setExcerptEn(row.excerptEn ?? "");
    setArticleDateLocal(toDatetimeLocalValue(row.articleDate) || toDatetimeLocalValue(row.publishedAt) || defaultArticleDateLocal());
    setIsPublished(!!row.publishedAt);
    setSortOrder(row.sortOrder);
    setHeroImageR2Key(row.heroImageR2Key);
    setHeroFile(null);
    setHeroPreviewUrl(heroUrlFromKey(row.heroImageR2Key));
    setHeroZoom(1);
  }, []);

  useEffect(() => {
    if (mode !== "edit" || !postId) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/admin/journal");
        if (!res.ok) throw new Error("load");
        const data = await res.json();
        const list: JournalRow[] = Array.isArray(data.items) ? data.items : [];
        const row = list.find((x) => x.id === postId);
        if (!row || cancelled) {
          if (!cancelled) router.replace("/admin/journal");
          return;
        }
        applyRow(row);
      } catch {
        if (!cancelled) router.replace("/admin/journal");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [mode, postId, router, applyRow]);

  const uploadHero = async (): Promise<string | null> => {
    if (!heroFile) return heroImageR2Key;
    setUploadingHero(true);
    try {
      const fd = new FormData();
      fd.set("file", heroFile);
      const res = await fetch("/api/admin/journal/upload", { method: "POST", body: fd });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Upload failed");
      }
      const data = await res.json();
      return data.r2Key ?? null;
    } catch (e) {
      alert(e instanceof Error ? e.message : "Upload failed");
      return heroImageR2Key;
    } finally {
      setUploadingHero(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const tId = titleId.trim();
    const tEn = titleEn.trim();
    const cId = contentId.trim();
    const cEn = contentEn.trim();
    if (!tId && !tEn) {
      alert(locale === "id" ? "Isi minimal satu judul (ID atau EN)." : "Enter at least one title (ID or EN).");
      return;
    }
    if (!cId && !cEn) {
      alert(locale === "id" ? "Isi minimal satu isi artikel (ID atau EN)." : "Enter at least one article body (ID or EN).");
      return;
    }

    setSaving(true);
    try {
      const heroR2Key = await uploadHero();
      const articleDateIso =
        articleDateLocal.trim() === "" ? null : new Date(articleDateLocal).toISOString();

      const payload = {
        titleId: tId || tEn,
        titleEn: tEn || tId,
        contentId: cId || cEn,
        contentEn: cEn || cId,
        excerptId: excerptId.trim() || excerptEn.trim() ? excerptId.trim() || excerptEn.trim() : undefined,
        excerptEn: excerptEn.trim() || excerptId.trim() ? excerptEn.trim() || excerptId.trim() : undefined,
        heroImageR2Key: heroR2Key || undefined,
        articleDate: articleDateIso,
        publishedAt: isPublished ? true : null,
        sortOrder,
      };

      if (mode === "edit" && postId) {
        const res = await fetch(`/api/admin/journal/${postId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error || "Update failed");
        }
      } else {
        const res = await fetch("/api/admin/journal", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error || "Create failed");
        }
        const data = await res.json();
        if (data.item?.slug) setSlugSaved(data.item.slug);
      }
      router.push("/admin/journal");
      router.refresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <AdminPageLayout eyebrow="Admin" title={t("title")} leading={backLink}>
        <div className="space-y-4 py-2">
          <div className="h-24 animate-pulse rounded-2xl bg-white/[0.05]" />
          <div className="h-40 animate-pulse rounded-2xl bg-white/[0.04]" />
          <div className="h-64 animate-pulse rounded-2xl bg-white/[0.03]" />
        </div>
      </AdminPageLayout>
    );
  }

  return (
    <>
      <AdminPageLayout
        eyebrow="Admin"
        title={mode === "edit" ? t("editPost") : t("newPost")}
        description={mode === "edit" ? t("formDescriptionEdit") : t("formDescriptionNew")}
        leading={backLink}
        noContentPadding
      >
        <div className={clsx(cardClass, "mx-0 mb-8 border-luxury-gold/15 px-5 py-5 sm:px-6 sm:py-6")}>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.14em] text-white/45">
                <Link2 className="h-3.5 w-3.5 text-luxury-gold/60" aria-hidden />
                {t("publicUrlLabel")}
              </p>
              <a
                href={publicArticleHref}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 block break-all font-mono text-[13px] leading-relaxed text-luxury-gold/95 underline-offset-2 hover:underline"
              >
                {publicArticleHref}
              </a>
              <p className="mt-3 text-[11px] leading-relaxed text-white/38">{t("publicUrlHint")}</p>
            </div>
          </div>
        </div>

        <form id={FORM_ID} onSubmit={handleSubmit} className="mx-auto max-w-5xl space-y-8 pb-32">
          <section className={clsx(cardClass, "p-5 sm:p-6")}>
            <SectionTitle icon={Calendar}>{t("sectionMeta")}</SectionTitle>
            <div className="grid gap-6 lg:grid-cols-2 lg:gap-8">
              <div>
                <label className="mb-2 block text-xs font-medium text-white/60">{t("articleDate")}</label>
                <input
                  type="datetime-local"
                  value={articleDateLocal}
                  onChange={(e) => setArticleDateLocal(e.target.value)}
                  className={inputClass}
                />
                <p className="mt-2 text-[11px] leading-relaxed text-white/40">{t("articleDateHint")}</p>
              </div>
              <div className="flex flex-col justify-end gap-5 rounded-xl border border-white/[0.06] bg-black/25 p-4 sm:p-5">
                <label className="flex cursor-pointer items-center gap-3 text-sm text-white/88">
                  <input
                    type="checkbox"
                    checked={isPublished}
                    onChange={(e) => setIsPublished(e.target.checked)}
                    className="h-4 w-4 rounded border-white/25 bg-black/50 text-luxury-gold focus:ring-luxury-gold/40"
                  />
                  <span className="font-medium">{t("published")}</span>
                </label>
                <div className="flex flex-wrap items-center gap-3">
                  <label className="text-xs font-medium text-white/55">{t("sortOrder")}</label>
                  <input
                    type="number"
                    value={sortOrder}
                    onChange={(e) => setSortOrder(parseInt(e.target.value, 10) || 0)}
                    className={clsx(inputClass, "w-28")}
                  />
                </div>
              </div>
            </div>
          </section>

          <section className={clsx(cardClass, "p-5 sm:p-6")}>
            <SectionTitle icon={ImageIcon}>{t("heroImage")}</SectionTitle>
            <p className="mb-4 text-xs leading-relaxed text-white/45">{t("heroImageHelp")}</p>
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-dashed border-white/20 bg-black/30 px-4 py-3 text-sm text-white/78 transition hover:border-luxury-gold/25 hover:bg-white/[0.04]">
              <Upload className="h-4 w-4 shrink-0 text-luxury-gold/70" />
              {heroFile ? heroFile.name : heroImageR2Key ? t("replaceHero") : t("chooseHero")}
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0] ?? null;
                  setHeroFile(f);
                  if (f) {
                    setHeroPreviewUrl(URL.createObjectURL(f));
                    setHeroZoom(1);
                  }
                }}
              />
            </label>
            {uploadingHero && <p className="mt-3 text-sm text-white/50">Uploading…</p>}

            {(heroPreviewUrl || heroImageR2Key) && (
              <div className="mt-6 space-y-4">
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setHeroZoom((z) => Math.max(0.5, Math.round((z - 0.2) * 10) / 10))}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-white/12 bg-white/[0.05] px-3 py-2 text-xs font-medium text-white/80 transition hover:bg-white/10"
                  >
                    <ZoomOut className="h-3.5 w-3.5" />
                    {t("zoomOut")}
                  </button>
                  <button
                    type="button"
                    onClick={() => setHeroZoom((z) => Math.min(2.5, Math.round((z + 0.2) * 10) / 10))}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-white/12 bg-white/[0.05] px-3 py-2 text-xs font-medium text-white/80 transition hover:bg-white/10"
                  >
                    <ZoomIn className="h-3.5 w-3.5" />
                    {t("zoomIn")}
                  </button>
                  <button
                    type="button"
                    onClick={() => setHeroZoom(1)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-white/12 bg-white/[0.05] px-3 py-2 text-xs font-medium text-white/80 transition hover:bg-white/10"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    {t("zoomReset")}
                  </button>
                  <span className="text-[11px] tabular-nums text-white/40">{Math.round(heroZoom * 100)}%</span>
                </div>
                <div className="max-h-[min(420px,55vh)] overflow-auto rounded-xl border border-white/[0.08] bg-black/55">
                  <div className="flex min-h-[260px] min-w-full items-center justify-center p-6">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={heroPreviewUrl ?? heroUrlFromKey(heroImageR2Key) ?? undefined}
                      alt=""
                      className="max-h-[70vh] w-auto max-w-full object-contain shadow-xl transition-transform duration-200 ease-out"
                      style={{
                        transform: `scale(${heroZoom})`,
                        transformOrigin: "center center",
                      }}
                    />
                  </div>
                </div>
              </div>
            )}
          </section>

          <section className={clsx(cardClass, "p-5 sm:p-6")}>
            <SectionTitle icon={Type}>{t("sectionHeadlines")}</SectionTitle>
            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <label className="mb-2 block text-xs font-medium text-white/60">{t("titleId")}</label>
                <input type="text" value={titleId} onChange={(e) => setTitleId(e.target.value)} className={inputClass} />
              </div>
              <div>
                <label className="mb-2 block text-xs font-medium text-white/60">{t("titleEn")}</label>
                <input type="text" value={titleEn} onChange={(e) => setTitleEn(e.target.value)} className={inputClass} />
              </div>
            </div>
            <div className="mt-5 grid gap-5 sm:grid-cols-2">
              <div>
                <label className="mb-2 block text-xs font-medium text-white/60">{t("excerptId")}</label>
                <input type="text" value={excerptId} onChange={(e) => setExcerptId(e.target.value)} className={inputClass} />
              </div>
              <div>
                <label className="mb-2 block text-xs font-medium text-white/60">{t("excerptEn")}</label>
                <input type="text" value={excerptEn} onChange={(e) => setExcerptEn(e.target.value)} className={inputClass} />
              </div>
            </div>
          </section>

          <section className={clsx(cardClass, "p-5 sm:p-6")}>
            <SectionTitle icon={FileText}>{t("sectionBody")}</SectionTitle>
            <p className="mb-5 text-xs leading-relaxed text-white/45">{t("bodyNoInlineImages")}</p>
            <div className="space-y-6">
              <div>
                <label className="mb-2 block text-xs font-medium text-white/60">{t("contentId")}</label>
                <JournalRichEditor
                  value={contentId}
                  onChange={setContentId}
                  placeholder="Tulis konten (Indonesia)…"
                />
              </div>
              <div>
                <label className="mb-2 block text-xs font-medium text-white/60">{t("contentEn")}</label>
                <JournalRichEditor
                  value={contentEn}
                  onChange={setContentEn}
                  placeholder="Write content (English)…"
                />
              </div>
            </div>
          </section>
        </form>
      </AdminPageLayout>

      {/* Fixed bottom action bar — always at viewport bottom; submit linked via form="" */}
      <div
        className="fixed inset-x-0 bottom-0 z-30 border-t border-white/[0.1] bg-black/92 backdrop-blur-xl shadow-[0_-12px_40px_rgba(0,0,0,0.65)]"
        style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
      >
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-2 px-4 py-3.5 sm:flex-row sm:items-center sm:justify-end sm:gap-3 sm:px-6 lg:px-8">
          <Link
            href="/admin/journal"
            className="rounded-xl border border-white/15 px-5 py-2.5 text-center text-sm font-medium text-white/85 transition hover:bg-white/10 sm:text-left"
          >
            {t("cancel")}
          </Link>
          <button
            type="submit"
            form={FORM_ID}
            disabled={saving}
            className="min-h-[44px] rounded-xl bg-gradient-to-r from-[#e8c547] to-[#c9a227] px-6 py-2.5 text-sm font-semibold text-black shadow-[0_0_20px_-4px_rgba(232,197,71,0.4)] transition hover:brightness-105 disabled:opacity-50 sm:min-w-[168px]"
          >
            {saving ? "…" : mode === "edit" ? t("savePost") : t("createPost")}
          </button>
        </div>
      </div>
    </>
  );
}
