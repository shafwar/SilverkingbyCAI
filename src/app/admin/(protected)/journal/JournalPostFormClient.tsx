"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations, useLocale } from "next-intl";
import { AdminPageLayout } from "@/components/admin/AdminPageLayout";
import { JournalRichEditor } from "@/components/admin/journal/JournalRichEditor";
import { ArrowLeft, ZoomIn, ZoomOut, RotateCcw, Upload } from "lucide-react";

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
      <AdminPageLayout eyebrow="Admin" title={t("title")}>
        <p className="text-white/50">Loading…</p>
      </AdminPageLayout>
    );
  }

  return (
    <AdminPageLayout
      eyebrow="Admin"
      title={mode === "edit" ? t("editPost") : t("newPost")}
      noContentPadding
      actions={
        <Link
          href="/admin/journal"
          className="inline-flex items-center gap-2 rounded-full border border-white/15 px-4 py-2 text-xs font-medium text-white/80 transition hover:border-white/30 hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          {t("backToList")}
        </Link>
      }
    >
      <div className="border-b border-white/[0.08] bg-black/20 px-4 py-4 sm:px-6 lg:px-8">
        <p className="text-[11px] text-white/45">{t("publicUrlLabel")}</p>
        <p className="mt-1 font-mono text-[12px] text-luxury-gold/90 break-all">{publicArticleHref}</p>
        <p className="mt-2 text-[11px] text-white/35">{t("publicUrlHint")}</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8 px-4 py-6 sm:px-6 lg:px-8 pb-24 max-w-5xl">
        <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 sm:p-6 space-y-5">
          <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-white/50">{t("sectionMeta")}</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-white/60">{t("articleDate")}</label>
              <input
                type="datetime-local"
                value={articleDateLocal}
                onChange={(e) => setArticleDateLocal(e.target.value)}
                className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white"
              />
              <p className="mt-1 text-[11px] text-white/40">{t("articleDateHint")}</p>
            </div>
            <div className="flex flex-col justify-end gap-3">
              <label className="flex items-center gap-2 text-sm text-white/85">
                <input
                  type="checkbox"
                  checked={isPublished}
                  onChange={(e) => setIsPublished(e.target.checked)}
                  className="rounded border-white/20"
                />
                {t("published")}
              </label>
              <div className="flex items-center gap-2">
                <label className="text-xs text-white/60 whitespace-nowrap">{t("sortOrder")}</label>
                <input
                  type="number"
                  value={sortOrder}
                  onChange={(e) => setSortOrder(parseInt(e.target.value, 10) || 0)}
                  className="w-24 rounded border border-white/10 bg-white/5 px-2 py-1.5 text-sm text-white"
                />
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 sm:p-6 space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-white/50">{t("heroImage")}</h2>
          <p className="text-xs text-white/45">{t("heroImageHelp")}</p>
          <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-dashed border-white/20 bg-black/30 px-4 py-3 text-sm text-white/75 hover:bg-white/5 w-fit">
            <Upload className="h-4 w-4 shrink-0" />
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
          {uploadingHero && <span className="text-sm text-white/50">Uploading…</span>}

          {(heroPreviewUrl || heroImageR2Key) && (
            <div className="space-y-3">
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setHeroZoom((z) => Math.max(0.5, Math.round((z - 0.2) * 10) / 10))}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 bg-white/5 px-3 py-1.5 text-xs text-white/80 hover:bg-white/10"
                >
                  <ZoomOut className="h-3.5 w-3.5" />
                  {t("zoomOut")}
                </button>
                <button
                  type="button"
                  onClick={() => setHeroZoom((z) => Math.min(2.5, Math.round((z + 0.2) * 10) / 10))}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 bg-white/5 px-3 py-1.5 text-xs text-white/80 hover:bg-white/10"
                >
                  <ZoomIn className="h-3.5 w-3.5" />
                  {t("zoomIn")}
                </button>
                <button
                  type="button"
                  onClick={() => setHeroZoom(1)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 bg-white/5 px-3 py-1.5 text-xs text-white/80 hover:bg-white/10"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  {t("zoomReset")}
                </button>
                <span className="self-center text-[11px] text-white/40 tabular-nums">{Math.round(heroZoom * 100)}%</span>
              </div>
              <div className="max-h-[min(420px,55vh)] overflow-auto rounded-xl border border-white/10 bg-black/60">
                <div className="flex min-h-[280px] min-w-full items-center justify-center p-6">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={heroPreviewUrl ?? heroUrlFromKey(heroImageR2Key) ?? undefined}
                    alt=""
                    className="max-h-[70vh] w-auto max-w-full object-contain shadow-lg transition-transform duration-200 ease-out"
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

        <section className="space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-white/50">{t("sectionHeadlines")}</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-white/60">{t("titleId")}</label>
              <input
                type="text"
                value={titleId}
                onChange={(e) => setTitleId(e.target.value)}
                className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-white/60">{t("titleEn")}</label>
              <input
                type="text"
                value={titleEn}
                onChange={(e) => setTitleEn(e.target.value)}
                className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white"
              />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-white/60">{t("excerptId")}</label>
              <input
                type="text"
                value={excerptId}
                onChange={(e) => setExcerptId(e.target.value)}
                className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-white/60">{t("excerptEn")}</label>
              <input
                type="text"
                value={excerptEn}
                onChange={(e) => setExcerptEn(e.target.value)}
                className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white"
              />
            </div>
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-white/50">{t("sectionBody")}</h2>
          <p className="text-xs text-white/45">{t("bodyNoInlineImages")}</p>
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
        </section>

        <div className="sticky bottom-0 left-0 right-0 flex flex-wrap justify-end gap-2 border-t border-white/10 bg-black/90 py-4 backdrop-blur-md -mx-4 px-4 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
          <Link
            href="/admin/journal"
            className="rounded-lg border border-white/15 px-5 py-2.5 text-sm text-white/85 hover:bg-white/10"
          >
            {t("cancel")}
          </Link>
          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-luxury-gold/90 px-6 py-2.5 text-sm font-semibold text-black hover:bg-luxury-gold disabled:opacity-50"
          >
            {saving ? "…" : mode === "edit" ? t("savePost") : t("createPost")}
          </button>
        </div>
      </form>
    </AdminPageLayout>
  );
}
