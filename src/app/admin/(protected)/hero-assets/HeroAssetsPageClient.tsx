"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { AdminPageLayout } from "@/components/admin/AdminPageLayout";
import { HeroAdminPreview } from "@/components/admin/HeroAdminPreview";
import { ImageIcon, Pin, RefreshCw, RotateCcw, Upload } from "lucide-react";
import type { PageHeroCmsSlug } from "@/lib/page-hero-cms-config";
import { toast } from "sonner";

type HeroRow = {
  page: string;
  label: string;
  defaultMediaType: "VIDEO" | "IMAGE";
  mediaType: "VIDEO" | "IMAGE";
  cmsActive: boolean;
  mediaUrl: string | null;
  posterUrl: string | null;
  previewPosterUrl: string;
  previewMediaUrl: string;
  fallbackMediaUrl: string;
  fallbackPosterUrl: string;
  updatedAt: string | null;
  version: number;
};

export function HeroAssetsPageClient() {
  const t = useTranslations("admin.heroAssets");
  const [heroes, setHeroes] = useState<HeroRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadingPage, setUploadingPage] = useState<string | null>(null);
  const [restoringPage, setRestoringPage] = useState<string | null>(null);
  const [promotingPage, setPromotingPage] = useState<string | null>(null);
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/page-sections/heroes", { cache: "no-store" });
      if (!res.ok) throw new Error("load failed");
      const data = await res.json();
      setHeroes(Array.isArray(data.heroes) ? data.heroes : []);
    } catch {
      setHeroes([]);
      toast.error(t("loadError"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleUpload = async (page: string, type: "image" | "video", file: File) => {
    setUploadingPage(page);
    try {
      const fd = new FormData();
      fd.append("page", page);
      fd.append("section", "hero");
      fd.append("type", type);
      fd.append("file", file);

      const res = await fetch("/api/admin/page-sections/upload", { method: "POST", body: fd });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error ?? t("uploadError"));
        return;
      }
      toast.success(t("uploadSuccess"));
      await load();
    } catch {
      toast.error(t("uploadError"));
    } finally {
      setUploadingPage(null);
    }
  };

  const handleRestore = async (page: string) => {
    if (!confirm(t("restoreConfirm"))) return;
    setRestoringPage(page);
    try {
      const res = await fetch("/api/admin/page-sections/restore", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ page, section: "hero" }),
      });
      if (!res.ok) {
        toast.error(t("restoreError"));
        return;
      }
      toast.success(t("restoreSuccess"));
      await load();
    } catch {
      toast.error(t("restoreError"));
    } finally {
      setRestoringPage(null);
    }
  };

  const handlePromote = async (page: string) => {
    if (!confirm(t("promoteConfirm"))) return;
    setPromotingPage(page);
    try {
      const res = await fetch("/api/admin/page-sections/heroes/promote-default", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ page }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error ?? t("promoteError"));
        return;
      }
      toast.success(t("promoteSuccess"));
      await load();
    } catch {
      toast.error(t("promoteError"));
    } finally {
      setPromotingPage(null);
    }
  };

  const openFilePicker = (page: string, type: "image" | "video") => {
    const input = fileInputRefs.current[page];
    if (!input) return;
    input.accept = type === "image" ? "image/jpeg,image/png,image/webp" : "video/mp4,video/webm";
    input.dataset.uploadType = type;
    input.click();
  };

  return (
    <AdminPageLayout
      eyebrow={t("eyebrow")}
      title={t("title")}
      description={t("description")}
      actions={
        <button
          type="button"
          onClick={() => void load()}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-full border border-white/15 px-4 py-2 text-xs text-white/80 hover:border-white/30"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          {t("refresh")}
        </button>
      }
    >
      <div className="mb-6 rounded-xl border border-luxury-gold/20 bg-luxury-gold/5 px-4 py-3 text-sm text-white/75">
        {t("hint")}
      </div>

      {loading && heroes.length === 0 ? (
        <p className="text-white/50">{t("loading")}</p>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {heroes.map((hero) => {
            const isUploading = uploadingPage === hero.page;
            const isRestoring = restoringPage === hero.page;
            const isPromoting = promotingPage === hero.page;

            return (
              <article
                key={hero.page}
                className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03]"
              >
                <div className="relative aspect-video bg-black/40">
                  <HeroAdminPreview
                    page={hero.page as PageHeroCmsSlug}
                    mediaType={hero.mediaType}
                    cmsPosterUrl={hero.previewPosterUrl}
                    cmsMediaUrl={hero.previewMediaUrl}
                    version={hero.version}
                  />
                  <span
                    className={`absolute left-3 top-3 rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider ${
                      hero.cmsActive
                        ? "bg-luxury-gold/90 text-black"
                        : "bg-black/60 text-white/70"
                    }`}
                  >
                    {hero.cmsActive ? t("badgeCms") : t("badgeDefault")}
                  </span>
                </div>

                <div className="space-y-3 p-4">
                  <div>
                    <h2 className="text-lg font-semibold text-white">{hero.label}</h2>
                    <p className="text-xs text-white/45">{hero.page}</p>
                    <p className="mt-1 text-xs text-white/55">
                      {hero.mediaType === "VIDEO" ? t("typeVideo") : t("typeImage")}
                      {hero.cmsActive && hero.updatedAt
                        ? ` · ${new Date(hero.updatedAt).toLocaleString()}`
                        : ""}
                    </p>
                  </div>

                  <input
                    ref={(el) => {
                      fileInputRefs.current[hero.page] = el;
                    }}
                    type="file"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      const uploadType = e.currentTarget.dataset.uploadType as
                        | "image"
                        | "video"
                        | undefined;
                      if (file && uploadType) {
                        void handleUpload(hero.page, uploadType, file);
                      }
                      e.target.value = "";
                    }}
                  />

                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={isUploading || isRestoring || isPromoting}
                      onClick={() => openFilePicker(hero.page, "video")}
                      className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-luxury-gold px-3 py-2 text-xs font-semibold text-black disabled:opacity-50"
                    >
                      <Upload className="h-3.5 w-3.5" />
                      {isUploading ? t("uploading") : t("uploadVideo")}
                    </button>
                    <button
                      type="button"
                      disabled={isUploading || isRestoring || isPromoting}
                      onClick={() => openFilePicker(hero.page, "image")}
                      className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-white/15 px-3 py-2 text-xs text-white/85 disabled:opacity-50"
                    >
                      <ImageIcon className="h-3.5 w-3.5" />
                      {t("uploadPhoto")}
                    </button>
                  </div>

                  {hero.cmsActive ? (
                    <>
                      <button
                        type="button"
                        disabled={isUploading || isRestoring || isPromoting}
                        onClick={() => void handlePromote(hero.page)}
                        className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-luxury-gold/40 bg-luxury-gold/10 px-3 py-2 text-xs text-luxury-gold disabled:opacity-50"
                      >
                        <Pin className="h-3.5 w-3.5" />
                        {isPromoting ? t("promoting") : t("promoteDefault")}
                      </button>
                      <button
                        type="button"
                        disabled={isUploading || isRestoring || isPromoting}
                        onClick={() => void handleRestore(hero.page)}
                        className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-red-500/30 px-3 py-2 text-xs text-red-300/90 disabled:opacity-50"
                      >
                        <RotateCcw className="h-3.5 w-3.5" />
                        {isRestoring ? t("restoring") : t("restoreDefault")}
                      </button>
                    </>
                  ) : null}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </AdminPageLayout>
  );
}
