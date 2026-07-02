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

type UploadPhase = "uploading" | "processing";

type UploadState = {
  page: string;
  type: "image" | "video";
  progress: number;
  phase: UploadPhase;
} | null;

const VIDEO_BYTES_WEIGHT = 55;
const IMAGE_BYTES_WEIGHT = 85;
const PROCESSING_CAP = 94;
const IMAGE_UPLOAD_TIMEOUT_MS = 90_000;
const VIDEO_UPLOAD_TIMEOUT_MS = 300_000;

function HeroUploadProgress({
  progress,
  phase,
  type,
  labels,
}: {
  progress: number;
  phase: UploadPhase;
  type: "image" | "video";
  labels: {
    uploading: string;
    processingVideo: string;
    processingImage: string;
  };
}) {
  const phaseLabel =
    phase === "processing"
      ? type === "video"
        ? labels.processingVideo
        : labels.processingImage
      : labels.uploading;

  return (
    <div className="space-y-1.5">
      <div className="flex justify-between text-[11px] text-white/60">
        <span>{phaseLabel}</span>
        <span className="tabular-nums font-medium text-white/80">{progress}%</span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
        <div
          className="h-full rounded-full bg-luxury-gold transition-[width] duration-300 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}

export function HeroAssetsPageClient() {
  const t = useTranslations("admin.heroAssets");
  const [heroes, setHeroes] = useState<HeroRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadState, setUploadState] = useState<UploadState>(null);
  const [restoringPage, setRestoringPage] = useState<string | null>(null);
  const [promotingPage, setPromotingPage] = useState<string | null>(null);
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const processingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearProcessingTimer = useCallback(() => {
    if (processingTimerRef.current) {
      clearInterval(processingTimerRef.current);
      processingTimerRef.current = null;
    }
  }, []);

  useEffect(() => () => clearProcessingTimer(), [clearProcessingTimer]);

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

  const startProcessingProgress = useCallback(
    (page: string, type: "image" | "video", fromProgress: number) => {
      clearProcessingTimer();
      setUploadState({ page, type, progress: fromProgress, phase: "processing" });
      processingTimerRef.current = setInterval(() => {
        setUploadState((prev) => {
          if (!prev || prev.page !== page) return prev;
          if (prev.progress >= PROCESSING_CAP) return prev;
          const step = type === "video" ? 0.6 : 1.2;
          return { ...prev, progress: Math.min(PROCESSING_CAP, Math.round(prev.progress + step)) };
        });
      }, 400);
    },
    [clearProcessingTimer]
  );

  const handleUpload = useCallback(
    (page: string, type: "image" | "video", file: File) => {
      clearProcessingTimer();
      const bytesWeight = type === "video" ? VIDEO_BYTES_WEIGHT : IMAGE_BYTES_WEIGHT;
      setUploadState({ page, type, progress: 0, phase: "uploading" });

      const formData = new FormData();
      formData.set("page", page);
      formData.set("section", "hero");
      formData.set("type", type);
      formData.set("file", file);

      const xhr = new XMLHttpRequest();
      xhr.open("POST", "/api/admin/page-sections/upload");
      xhr.timeout = type === "video" ? VIDEO_UPLOAD_TIMEOUT_MS : IMAGE_UPLOAD_TIMEOUT_MS;

      let uploadBytesComplete = false;

      xhr.upload.addEventListener("progress", (ev) => {
        if (ev.lengthComputable) {
          const pct = Math.round((ev.loaded / ev.total) * bytesWeight);
          setUploadState({ page, type, progress: Math.min(pct, bytesWeight), phase: "uploading" });
          if (ev.loaded >= ev.total && !uploadBytesComplete) {
            uploadBytesComplete = true;
            startProcessingProgress(page, type, Math.min(pct, bytesWeight));
          }
        } else {
          setUploadState((prev) => {
            if (!prev || prev.page !== page) return prev;
            const next = Math.min(prev.progress + 4, bytesWeight - 1);
            return { ...prev, progress: next };
          });
        }
      });

      xhr.addEventListener("load", async () => {
        clearProcessingTimer();
        try {
          const data: { url?: string; error?: string } = (() => {
            try {
              return JSON.parse(xhr.responseText || "{}");
            } catch {
              return {};
            }
          })();
          const ok = xhr.status >= 200 && xhr.status < 300 && typeof data?.url === "string";
          if (ok) {
            setUploadState({ page, type, progress: 100, phase: "processing" });
            toast.success(t("uploadSuccess"));
            await load();
            setUploadState(null);
            return;
          }
          toast.error(data?.error ?? t("uploadError"));
        } catch {
          toast.error(t("uploadError"));
        } finally {
          setUploadState(null);
        }
      });

      xhr.addEventListener("error", () => {
        clearProcessingTimer();
        toast.error(t("uploadError"));
        setUploadState(null);
      });

      xhr.addEventListener("timeout", () => {
        clearProcessingTimer();
        xhr.abort();
        toast.error(t("uploadTimeout"));
        setUploadState(null);
      });

      xhr.addEventListener("abort", () => {
        clearProcessingTimer();
        setUploadState(null);
      });

      xhr.send(formData);
    },
    [clearProcessingTimer, load, startProcessingProgress, t]
  );

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

  const progressLabels = {
    uploading: t("progressUploading"),
    processingVideo: t("progressProcessingVideo"),
    processingImage: t("progressProcessingImage"),
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
            const cardUpload = uploadState?.page === hero.page ? uploadState : null;
            const isUploading = cardUpload != null;
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
                    cmsPosterUrl={hero.cmsActive ? hero.posterUrl : null}
                    cmsMediaUrl={hero.cmsActive ? hero.mediaUrl : null}
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
                        handleUpload(hero.page, uploadType, file);
                      }
                      e.target.value = "";
                    }}
                  />

                  {cardUpload ? (
                    <HeroUploadProgress
                      progress={cardUpload.progress}
                      phase={cardUpload.phase}
                      type={cardUpload.type}
                      labels={progressLabels}
                    />
                  ) : null}

                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={isUploading || isRestoring || isPromoting}
                      onClick={() => openFilePicker(hero.page, "video")}
                      className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-luxury-gold px-3 py-2 text-xs font-semibold text-black disabled:opacity-50"
                    >
                      <Upload className="h-3.5 w-3.5" />
                      {isUploading && cardUpload?.type === "video"
                        ? `${cardUpload.progress}%`
                        : t("uploadVideo")}
                    </button>
                    <button
                      type="button"
                      disabled={isUploading || isRestoring || isPromoting}
                      onClick={() => openFilePicker(hero.page, "image")}
                      className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-white/15 px-3 py-2 text-xs text-white/85 disabled:opacity-50"
                    >
                      <ImageIcon className="h-3.5 w-3.5" />
                      {isUploading && cardUpload?.type === "image"
                        ? `${cardUpload.progress}%`
                        : t("uploadPhoto")}
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
