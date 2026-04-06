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
  ChevronLeft,
  ChevronRight,
  Globe,
  FilePenLine,
  type LucideIcon,
} from "lucide-react";
import clsx from "clsx";

const FORM_ID = "admin-journal-post-form";

const shellClass =
  "rounded-xl border border-white/[0.07] bg-gradient-to-b from-white/[0.05] to-white/[0.015] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] sm:rounded-2xl";

/** text-base on small screens avoids iOS zoom on focus; sm+ uses compact text-sm */
const inputClass =
  "w-full min-w-0 rounded-xl border border-white/10 bg-black/40 px-3.5 py-3 text-base text-white placeholder:text-white/25 outline-none transition focus:border-luxury-gold/40 focus:ring-2 focus:ring-luxury-gold/12 sm:py-2.5 sm:text-sm";

/** Body / hint copy under fields — readable on dark admin UI */
const helperTextClass = "text-[0.9375rem] leading-relaxed text-white/52 sm:text-sm";

/** Article content — main instruction (slightly bolder, clearer) */
const contentWizardIntroClass =
  "text-[0.8125rem] font-medium leading-relaxed text-white/62 sm:text-sm sm:font-semibold sm:leading-relaxed sm:text-white/70";

/** Article content — secondary note under editor toolbar */
const contentEditorNoteClass =
  "text-[0.75rem] font-medium leading-snug text-white/48 sm:text-xs sm:leading-relaxed sm:text-white/55";

/** Compact inputs for title/excerpt in content section */
const contentInputClass =
  "w-full min-w-0 rounded-lg border border-white/10 bg-black/40 px-2.5 py-2 text-base text-white placeholder:text-white/25 outline-none transition focus:border-luxury-gold/40 focus:ring-2 focus:ring-luxury-gold/12 sm:rounded-xl sm:px-3 sm:py-1.5 sm:text-sm";

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

/** TipTap empty doc is often `<p></p>` — treat as no real body so validation matches what users see */
function isRichTextEffectivelyEmpty(html: string): boolean {
  const text = html
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/\u00a0/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return text === "";
}

function heroUrlFromKey(r2Key: string | null | undefined): string | null {
  if (!r2Key) return null;
  const base = process.env.NEXT_PUBLIC_R2_PUBLIC_URL?.replace(/\/$/, "");
  if (base) return `${base}/${r2Key}`;
  if (r2Key.startsWith("static/")) return `/${r2Key.slice("static/".length)}`;
  return null;
}

function FieldLabel({ children, dense }: { children: React.ReactNode; dense?: boolean }) {
  return (
    <span
      className={clsx(
        "block uppercase tracking-[0.12em] text-white/55",
        dense
          ? "mb-1 text-[0.6875rem] font-bold tracking-[0.11em] text-white/62 sm:text-[0.75rem] sm:tracking-[0.12em]"
          : "mb-1.5 text-[0.8125rem] font-semibold sm:mb-2 sm:text-[13px]"
      )}
    >
      {children}
    </span>
  );
}

function Subheading({ icon: Icon, children }: { icon: LucideIcon; children: React.ReactNode }) {
  return (
    <div className="mb-2 flex items-center gap-2.5 sm:mb-3 sm:gap-3">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/[0.04] text-luxury-gold/80 sm:h-9 sm:w-9">
        <Icon className="h-3.5 w-3.5 sm:h-4 sm:w-4" strokeWidth={1.75} />
      </span>
      <h2 className="min-w-0 text-[0.9375rem] font-semibold leading-snug tracking-tight text-white/92 sm:text-base">
        {children}
      </h2>
    </div>
  );
}

type Props = { mode: "new" | "edit"; postId?: number };

type LangPage = 0 | 1;

export function JournalPostFormClient({ mode, postId }: Props) {
  const t = useTranslations("admin.journal");
  const locale = useLocale();
  const router = useRouter();
  const [loading, setLoading] = useState(mode === "edit");
  const [saving, setSaving] = useState(false);
  const [uploadingHero, setUploadingHero] = useState(false);
  const [heroZoom, setHeroZoom] = useState(1);
  const [slugSaved, setSlugSaved] = useState<string | null>(null);
  const [langPage, setLangPage] = useState<LangPage>(0);

  const [titleId, setTitleId] = useState("");
  const [titleEn, setTitleEn] = useState("");
  const [contentId, setContentId] = useState("");
  const [contentEn, setContentEn] = useState("");
  const [excerptId, setExcerptId] = useState("");
  const [excerptEn, setExcerptEn] = useState("");
  const [articleDateLocal, setArticleDateLocal] = useState(defaultArticleDateLocal);
  const [isPublished, setIsPublished] = useState(false);
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
      className="group inline-flex min-h-[44px] max-w-full touch-manipulation items-center justify-start gap-2 rounded-xl border border-white/[0.12] bg-white/[0.05] px-3.5 py-2.5 text-sm font-medium text-white/85 transition hover:border-white/20 hover:bg-white/[0.08] hover:text-white sm:min-h-0 sm:px-4"
    >
      <ArrowLeft className="h-4 w-4 shrink-0 transition-transform group-hover:-translate-x-0.5" strokeWidth={2} />
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
    setHeroImageR2Key(row.heroImageR2Key);
    setHeroFile(null);
    setHeroPreviewUrl(heroUrlFromKey(row.heroImageR2Key));
    setHeroZoom(1);
    setLangPage(0);
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
    const bodyIdEmpty = isRichTextEffectivelyEmpty(cId);
    const bodyEnEmpty = isRichTextEffectivelyEmpty(cEn);
    if (!tId && !tEn) {
      alert(locale === "id" ? "Isi minimal satu judul (ID atau EN)." : "Enter at least one title (ID or EN).");
      return;
    }
    if (bodyIdEmpty && bodyEnEmpty) {
      alert(locale === "id" ? "Isi minimal satu isi artikel (ID atau EN)." : "Enter at least one article body (ID or EN).");
      return;
    }

    setSaving(true);
    try {
      const heroR2Key = await uploadHero();
      const articleDateIso =
        articleDateLocal.trim() === "" ? null : new Date(articleDateLocal).toISOString();

      const htmlId = bodyIdEmpty ? "" : cId;
      const htmlEn = bodyEnEmpty ? "" : cEn;

      const payload = {
        titleId: tId || tEn,
        titleEn: tEn || tId,
        contentId: htmlId || htmlEn,
        contentEn: htmlEn || htmlId,
        excerptId: excerptId.trim() || excerptEn.trim() ? excerptId.trim() || excerptEn.trim() : undefined,
        excerptEn: excerptEn.trim() || excerptId.trim() ? excerptEn.trim() || excerptId.trim() : undefined,
        heroImageR2Key: heroR2Key || undefined,
        articleDate: articleDateIso,
        publishedAt: isPublished ? true : null,
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

  const segBtn = (active: boolean) =>
    clsx(
      "relative min-h-[44px] flex-1 touch-manipulation rounded-lg px-2 py-2 text-xs font-medium transition sm:min-h-0 sm:px-4 sm:py-2.5 sm:text-sm",
      active
        ? "bg-luxury-gold/20 text-luxury-gold shadow-[inset_0_0_0_1px_rgba(232,197,71,0.25)]"
        : "text-white/55 hover:bg-white/[0.06] hover:text-white/85"
    );

  const arrowNavBtn = (enabled: boolean) =>
    clsx(
      "flex h-11 w-11 shrink-0 touch-manipulation items-center justify-center rounded-xl border transition",
      enabled
        ? "border-white/12 bg-white/[0.06] text-white/90 hover:border-luxury-gold/30 hover:bg-white/[0.09] hover:text-luxury-gold"
        : "cursor-not-allowed border-white/[0.05] bg-white/[0.02] text-white/20"
    );

  const contentSegBtn = (active: boolean) =>
    clsx(
      "relative flex min-h-[42px] flex-1 touch-manipulation items-center justify-center rounded-xl px-2.5 text-center text-[11px] font-bold tracking-[0.05em] transition-all duration-200 sm:min-h-[40px] sm:px-4 sm:text-sm sm:tracking-[0.06em]",
      active
        ? "bg-gradient-to-b from-[#e8c547]/25 via-luxury-gold/15 to-luxury-gold/[0.08] text-[#f5e6a8] shadow-[inset_0_1px_0_rgba(255,255,255,0.14),inset_0_0_0_1px_rgba(232,197,71,0.45),0_4px_16px_-6px_rgba(212,175,55,0.4)]"
        : "text-white/50 hover:bg-white/[0.07] hover:text-white/90"
    );

  const contentArrowNavBtn = (enabled: boolean) =>
    clsx(
      "flex h-10 w-10 shrink-0 touch-manipulation items-center justify-center rounded-xl border transition-all duration-200 sm:h-11 sm:w-11",
      enabled
        ? "border-white/[0.12] bg-gradient-to-b from-white/[0.1] to-white/[0.03] text-white/75 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] hover:border-luxury-gold/40 hover:from-luxury-gold/[0.15] hover:to-luxury-gold/[0.05] hover:text-[#f0dc82] active:scale-[0.97]"
        : "cursor-not-allowed border border-white/[0.05] bg-black/30 text-white/[0.12]"
    );

  const headerTitleIcon = (
    <FilePenLine className="h-4 w-4 sm:h-5 sm:w-5" strokeWidth={1.75} aria-hidden />
  );

  if (loading) {
    return (
      <AdminPageLayout
        eyebrow="Admin"
        title={t("title")}
        leading={backLink}
        titleIcon={headerTitleIcon}
        fluid
        detachedFromNav
      >
        <div className="w-full min-w-0 space-y-4 py-4">
          <div className="h-20 animate-pulse rounded-2xl bg-white/[0.05]" />
          <div className="h-36 animate-pulse rounded-2xl bg-white/[0.04]" />
          <div className="h-52 animate-pulse rounded-2xl bg-white/[0.03]" />
        </div>
      </AdminPageLayout>
    );
  }

  return (
    <AdminPageLayout
      eyebrow="Admin"
      title={mode === "edit" ? t("editPost") : t("newPost")}
      description={mode === "edit" ? t("formDescriptionEdit") : t("formDescriptionNew")}
      leading={backLink}
      titleIcon={headerTitleIcon}
      noContentPadding
      fluid
      detachedFromNav
    >
      <div className="w-full min-w-0 pb-10 pt-4 sm:pb-12 sm:pt-5 md:pt-6">
        <form
          id={FORM_ID}
          onSubmit={handleSubmit}
          className="touch-pan-y space-y-6 sm:space-y-8"
        >
          {/* Public URL — compact */}
          <div className={clsx(shellClass, "px-3.5 py-3.5 sm:px-5 sm:py-4")}>
            <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
              <div className="flex min-w-0 items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-white/50">
                <Link2 className="h-4 w-4 shrink-0 text-luxury-gold/60" aria-hidden />
                <span className="min-w-0">{t("publicUrlLabel")}</span>
              </div>
              <a
                href={publicArticleHref}
                target="_blank"
                rel="noopener noreferrer"
                className="min-w-0 break-all text-left font-mono text-[0.8125rem] leading-snug text-luxury-gold/90 underline-offset-2 hover:underline sm:max-w-[min(100%,28rem)] sm:text-sm"
              >
                {publicArticleHref}
              </a>
            </div>
            <p className={`mt-4 border-t border-white/[0.06] pt-4 ${helperTextClass}`}>{t("publicUrlHint")}</p>
          </div>

          {/* Setup: schedule + hero */}
          <div className={clsx(shellClass, "overflow-hidden")}>
            <div className="border-b border-white/[0.06] px-3.5 py-3.5 sm:px-5 sm:py-4">
              <Subheading icon={Calendar}>{t("sectionSetup")}</Subheading>
              <p className={helperTextClass}>{t("sectionSetupHint")}</p>
            </div>

            <div className="grid min-w-0 gap-0 md:grid-cols-[minmax(0,1fr)_minmax(220px,20rem)] lg:grid-cols-[minmax(0,1fr)_minmax(240px,22rem)] xl:grid-cols-[minmax(0,1fr)_minmax(260px,26rem)] md:divide-x md:divide-white/[0.06]">
              <div className="space-y-4 p-3.5 sm:space-y-5 sm:p-5">
                <div>
                  <FieldLabel>{t("articleDate")}</FieldLabel>
                  <input
                    type="datetime-local"
                    value={articleDateLocal}
                    onChange={(e) => setArticleDateLocal(e.target.value)}
                    className={inputClass}
                  />
                  <p className={`mt-2.5 ${helperTextClass}`}>{t("articleDateHint")}</p>
                </div>
                <div className="rounded-xl border border-white/[0.06] bg-black/25 px-3.5 py-3.5 sm:px-4">
                  <label className="flex min-h-[44px] cursor-pointer items-center gap-3 text-sm text-white/88 sm:min-h-0">
                    <input
                      type="checkbox"
                      checked={isPublished}
                      onChange={(e) => setIsPublished(e.target.checked)}
                      className="h-5 w-5 shrink-0 rounded border-white/25 bg-black/50 text-luxury-gold focus:ring-luxury-gold/40 sm:h-4 sm:w-4"
                    />
                    <span className="font-medium">{t("published")}</span>
                  </label>
                </div>
              </div>

              <div className="border-t border-white/[0.06] p-3.5 sm:p-5 md:border-t-0">
                <div className="mb-3 flex items-center gap-2.5">
                  <ImageIcon className="h-4 w-4 shrink-0 text-luxury-gold/70" />
                  <span className="text-xs font-semibold uppercase tracking-[0.12em] text-white/55 sm:text-[13px]">{t("heroImage")}</span>
                </div>
                <p className={`mb-4 ${helperTextClass}`}>{t("heroImageHelp")}</p>
                <label className="flex min-h-[48px] cursor-pointer touch-manipulation items-center justify-center gap-2 rounded-xl border border-dashed border-white/18 bg-black/30 px-3 py-3.5 text-center text-sm text-white/78 transition hover:border-luxury-gold/28 hover:bg-white/[0.04] sm:min-h-[44px] sm:px-4">
                  <Upload className="h-4 w-4 shrink-0 text-luxury-gold/65" />
                  <span className="min-w-0 truncate">
                    {heroFile ? heroFile.name : heroImageR2Key ? t("replaceHero") : t("chooseHero")}
                  </span>
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
                {uploadingHero ? <p className={`mt-3 ${helperTextClass}`}>Uploading…</p> : null}

                {(heroPreviewUrl || heroImageR2Key) && (
                  <div className="mt-4 space-y-2">
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => setHeroZoom((z) => Math.max(0.5, Math.round((z - 0.2) * 10) / 10))}
                        className="min-h-[40px] rounded-lg border border-white/10 bg-white/[0.05] px-3 py-2 text-xs font-medium text-white/78 hover:bg-white/10 sm:min-h-0 sm:px-2.5"
                      >
                        <ZoomOut className="mr-1 inline h-3.5 w-3.5" />
                        {t("zoomOut")}
                      </button>
                      <button
                        type="button"
                        onClick={() => setHeroZoom((z) => Math.min(2.5, Math.round((z + 0.2) * 10) / 10))}
                        className="min-h-[40px] rounded-lg border border-white/10 bg-white/[0.05] px-3 py-2 text-xs font-medium text-white/78 hover:bg-white/10 sm:min-h-0 sm:px-2.5"
                      >
                        <ZoomIn className="mr-1 inline h-3.5 w-3.5" />
                        {t("zoomIn")}
                      </button>
                      <button
                        type="button"
                        onClick={() => setHeroZoom(1)}
                        className="min-h-[40px] rounded-lg border border-white/10 bg-white/[0.05] px-3 py-2 text-xs font-medium text-white/78 hover:bg-white/10 sm:min-h-0 sm:px-2.5"
                      >
                        <RotateCcw className="mr-1 inline h-3.5 w-3.5" />
                        {t("zoomReset")}
                      </button>
                      <span className="self-center pl-1 text-xs tabular-nums text-white/45">{Math.round(heroZoom * 100)}%</span>
                    </div>
                    <div className="max-h-[min(50vh,220px)] overflow-auto rounded-xl border border-white/[0.08] bg-black/50 sm:max-h-[220px]">
                      <div className="flex min-h-[120px] items-center justify-center p-2 sm:min-h-[140px] sm:p-3">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={heroPreviewUrl ?? heroUrlFromKey(heroImageR2Key) ?? undefined}
                          alt=""
                          className="max-h-[min(42vh,200px)] w-auto max-w-full object-contain transition-transform duration-200 sm:max-h-[200px]"
                          style={{
                            transform: `scale(${heroZoom})`,
                            transformOrigin: "center center",
                          }}
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Bilingual content wizard */}
          <div className={clsx(shellClass, "overflow-hidden p-0")}>
            <div className="relative border-b border-white/[0.07] bg-gradient-to-b from-luxury-gold/[0.07] via-white/[0.03] to-transparent px-4 pb-5 pt-6 sm:px-6 sm:pb-6 sm:pt-8">
              <div
                className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-luxury-gold/40 to-transparent"
                aria-hidden
              />
              <div
                className="pointer-events-none absolute left-1/2 top-2 h-28 w-56 -translate-x-1/2 rounded-full bg-luxury-gold/[0.12] blur-[48px] sm:top-4 sm:h-32 sm:w-64"
                aria-hidden
              />
              <div className="relative flex min-w-0 flex-col items-center gap-3 text-center sm:gap-4">
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-luxury-gold/30 bg-gradient-to-b from-luxury-gold/[0.18] via-white/[0.08] to-black/50 text-luxury-gold shadow-[inset_0_1px_0_rgba(255,255,255,0.18),0_0_0_1px_rgba(212,175,55,0.12),0_12px_40px_-16px_rgba(212,175,55,0.35)] sm:h-[3.25rem] sm:w-[3.25rem]">
                  <Globe className="h-5 w-5 sm:h-6 sm:w-6" strokeWidth={2} />
                </span>
                <div className="flex min-w-0 max-w-lg flex-col items-center gap-2 px-2 sm:max-w-xl sm:gap-2.5">
                  <h2 className="bg-gradient-to-b from-white via-white to-white/82 bg-clip-text text-2xl font-extrabold leading-[1.15] tracking-tight text-transparent antialiased sm:text-[1.85rem] sm:leading-tight">
                    {t("sectionContentWizard")}
                  </h2>
                  <p className="inline-flex items-center justify-center rounded-full border border-luxury-gold/25 bg-black/35 px-3 py-1.5 text-[0.65rem] font-bold uppercase tracking-[0.16em] text-[#e8d48a] shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-sm sm:px-4 sm:text-[0.7rem]">
                    {t("wizardStepBadge", { page: langPage + 1 })}
                  </p>
                  <div className="flex justify-center gap-2 pt-0.5" aria-hidden>
                    <span
                      className={clsx(
                        "h-1.5 w-6 rounded-full transition-colors duration-300",
                        langPage === 0 ? "bg-gradient-to-r from-luxury-gold/80 to-luxury-gold/50" : "bg-white/15"
                      )}
                    />
                    <span
                      className={clsx(
                        "h-1.5 w-6 rounded-full transition-colors duration-300",
                        langPage === 1 ? "bg-gradient-to-r from-luxury-gold/80 to-luxury-gold/50" : "bg-white/15"
                      )}
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-4 px-3 py-4 sm:space-y-5 sm:px-5 sm:py-5">
              <p className={`mx-auto max-w-md text-center sm:max-w-lg ${contentWizardIntroClass}`}>
                {langPage === 0 ? t("contentWizardHintId") : t("contentWizardHintEn")}
              </p>

              <div className="mx-auto max-w-xl rounded-2xl border border-white/[0.08] bg-gradient-to-b from-black/45 to-black/25 p-1.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] sm:rounded-[1.125rem] sm:p-2">
                <div className="flex min-w-0 items-center gap-2 sm:gap-2.5">
                  <button
                    type="button"
                    disabled={langPage === 0}
                    aria-label={t("wizardPrevious")}
                    className={contentArrowNavBtn(langPage !== 0)}
                    onClick={() => setLangPage(0)}
                  >
                    <ChevronLeft className="h-4 w-4" strokeWidth={2.25} />
                  </button>

                  <div
                    className="flex min-w-0 flex-1 gap-1 rounded-xl bg-black/55 p-1 shadow-inner ring-1 ring-inset ring-white/[0.06] sm:gap-1 sm:rounded-2xl sm:p-1.5"
                    role="tablist"
                    aria-label={t("sectionContentWizard")}
                  >
                    <button
                      type="button"
                      role="tab"
                      aria-selected={langPage === 0}
                      className={contentSegBtn(langPage === 0)}
                      onClick={() => setLangPage(0)}
                    >
                      {t("wizardPrevious")}
                    </button>
                    <button
                      type="button"
                      role="tab"
                      aria-selected={langPage === 1}
                      className={contentSegBtn(langPage === 1)}
                      onClick={() => setLangPage(1)}
                    >
                      {t("wizardNext")}
                    </button>
                  </div>

                  <button
                    type="button"
                    disabled={langPage === 1}
                    aria-label={t("wizardNext")}
                    className={contentArrowNavBtn(langPage !== 1)}
                    onClick={() => setLangPage(1)}
                  >
                    <ChevronRight className="h-4 w-4" strokeWidth={2.25} />
                  </button>
                </div>
              </div>

              <p
                className={`mx-auto max-w-xl rounded-xl border border-white/[0.07] bg-gradient-to-br from-white/[0.05] to-white/[0.02] px-3 py-2.5 text-center sm:rounded-2xl sm:px-4 sm:py-3 ${contentEditorNoteClass}`}
              >
                {t("bodyNoInlineImages")}
              </p>

            {langPage === 0 ? (
              <div className="space-y-3 sm:space-y-3.5">
                <div>
                  <FieldLabel dense>{t("titleId")}</FieldLabel>
                  <input type="text" value={titleId} onChange={(e) => setTitleId(e.target.value)} className={contentInputClass} />
                </div>
                <div>
                  <FieldLabel dense>{t("excerptId")}</FieldLabel>
                  <input type="text" value={excerptId} onChange={(e) => setExcerptId(e.target.value)} className={contentInputClass} />
                </div>
                <div>
                  <FieldLabel dense>{t("contentId")}</FieldLabel>
                  <JournalRichEditor
                    compact
                    value={contentId}
                    onChange={setContentId}
                    placeholder="Tulis konten (Indonesia)…"
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-3 sm:space-y-3.5">
                <div>
                  <FieldLabel dense>{t("titleEn")}</FieldLabel>
                  <input type="text" value={titleEn} onChange={(e) => setTitleEn(e.target.value)} className={contentInputClass} />
                </div>
                <div>
                  <FieldLabel dense>{t("excerptEn")}</FieldLabel>
                  <input type="text" value={excerptEn} onChange={(e) => setExcerptEn(e.target.value)} className={contentInputClass} />
                </div>
                <div>
                  <FieldLabel dense>{t("contentEn")}</FieldLabel>
                  <JournalRichEditor
                    compact
                    value={contentEn}
                    onChange={setContentEn}
                    placeholder="Write content (English)…"
                  />
                </div>
              </div>
            )}
            </div>
          </div>

          {/* Actions — end of page only, not fixed */}
          <div className={clsx(shellClass, "px-3.5 py-4 sm:px-6 sm:py-6")}>
            <p className={`mb-3 text-center sm:mb-4 sm:text-left ${helperTextClass}`}>{t("actionsFooterHint")}</p>
            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end sm:gap-3">
              <Link
                href="/admin/journal"
                className="inline-flex min-h-[48px] w-full touch-manipulation items-center justify-center rounded-xl border border-white/18 px-5 py-3 text-center text-sm font-medium text-white/85 transition hover:bg-white/[0.06] sm:min-h-[44px] sm:w-auto sm:py-2.5"
              >
                {t("cancel")}
              </Link>
              <button
                type="submit"
                disabled={saving}
                className="inline-flex min-h-[48px] w-full touch-manipulation items-center justify-center rounded-xl bg-gradient-to-r from-[#e8c547] to-[#c9a227] px-6 py-3 text-sm font-semibold text-black shadow-[0_0_24px_-6px_rgba(232,197,71,0.35)] transition hover:brightness-105 disabled:opacity-50 sm:min-h-[44px] sm:w-auto sm:min-w-[160px] sm:py-2.5"
              >
                {saving ? "…" : mode === "edit" ? t("savePost") : t("createPost")}
              </button>
            </div>
          </div>
        </form>
      </div>
    </AdminPageLayout>
  );
}
