"use client";

import { useRef, useState, useEffect } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import { Pencil, RotateCcw } from "lucide-react";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { usePageSections, getCacheBustedMediaUrl } from "@/hooks/usePageSections";
import { getR2UrlClient } from "@/utils/r2-url";

const MAX_IMAGE_BYTES = 3 * 1024 * 1024;
const MAX_VIDEO_BYTES = 10 * 1024 * 1024; // 10 MB

type EditableMediaProps = {
  page: string;
  section: string;
  type: "image" | "video";
  /** Fallback when no CMS value (e.g. getR2UrlClient("/images/hero.jpg")) */
  fallbackUrl?: string;
  className?: string;
  /** For Next Image: fill mode */
  fill?: boolean;
  sizes?: string;
  alt?: string;
  /** Video: poster URL */
  poster?: string;
  /** Video: autoplay, muted, loop, playsInline */
  videoAttrs?: React.ComponentPropsWithoutRef<"video">;
  /** If true, render only edit overlay (parent renders media and owns data); call after upload so parent can refetch */
  overlayOnly?: boolean;
  /** When provided (e.g. overlayOnly), called after successful upload so parent can refetch */
  onUploadDone?: () => void;
  /** Optional label next to pencil (e.g. "Edit video") for visibility on dark backgrounds */
  editLabel?: string;
  /** When true with overlayOnly, the whole video/hero area is clickable to open edit modal */
  fullAreaClickable?: boolean;
};

export function EditableMedia({
  page,
  section,
  type,
  fallbackUrl,
  className = "",
  fill = false,
  sizes,
  alt = "",
  poster,
  videoAttrs = {},
  overlayOnly = false,
  onUploadDone,
  editLabel,
  fullAreaClickable = false,
}: EditableMediaProps) {
  const isAdmin = useIsAdmin();
  const { sections, loading: sectionsLoading, refetch } = usePageSections(page);
  const refetchAll = async () => {
    await refetch();
    onUploadDone?.();
  };
  const [modalOpen, setModalOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0); // 0–100
  const [restoring, setRestoring] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const rawUrl = sections[section]?.url ?? fallbackUrl ?? (type === "image" ? getR2UrlClient("/images/placeholder-hero.jpg") : undefined);
  const url = rawUrl != null ? getCacheBustedMediaUrl(rawUrl, sections[section]?.version) : undefined;
  const hasCustomMedia = Boolean(sections[section]);
  /** Resolved type for display: use stored mediaType when present (flexible replace), else section default */
  const displayType: "image" | "video" =
    sections[section]?.mediaType?.toUpperCase() === "VIDEO"
      ? "video"
      : sections[section]?.mediaType?.toUpperCase() === "IMAGE"
        ? "image"
        : type;

  const closeModal = () => {
    if (typeof document !== "undefined") {
      document.body.removeAttribute("data-cms-modal-open");
      document.body.style.overflow = "";
    }
    setModalOpen(false);
  };

  /** Set attribute immediately so PageTransitionOverlay never blurs when opening modal (same as home). */
  const setModalOpenAttribute = () => {
    if (typeof document !== "undefined" && document.body) {
      document.body.setAttribute("data-cms-modal-open", "true");
    }
  };

  const handleEditClick = (e?: React.MouseEvent) => {
    e?.preventDefault();
    e?.stopPropagation();
    if (!isAdmin) return;
    setError(null);
    setModalOpenAttribute();
    setModalOpen(true);
  };

  const handleRestore = async () => {
    if (!isAdmin || !hasCustomMedia) return;
    setError(null);
    setRestoring(true);
    try {
      const res = await fetch("/api/admin/page-sections/restore", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ page, section }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data?.error ?? "Restore failed.");
        return;
      }
      closeModal();
      await refetchAll();
    } catch {
      setError("Restore failed.");
    } finally {
      setRestoring(false);
    }
  };

  /** Detect upload type from selected file (flexible: section can accept image or video). */
  const getFileMediaType = (file: File): "image" | "video" | null => {
    if (file.type.startsWith("image/")) return "image";
    if (file.type.startsWith("video/")) return "video";
    return null;
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const uploadType = getFileMediaType(file);
    if (!uploadType) {
      setError("Use image (JPEG, PNG, WebP) or video (MP4, WebM).");
      e.target.value = "";
      return;
    }
    const limit = uploadType === "image" ? MAX_IMAGE_BYTES : MAX_VIDEO_BYTES;
    if (file.size > limit) {
      setError(uploadType === "image" ? "Image max 3 MB." : "Video max 10 MB.");
      e.target.value = "";
      return;
    }
    setError(null);
    setUploading(true);
    setUploadProgress(0);
    const formData = new FormData();
    formData.set("page", page);
    formData.set("section", section);
    formData.set("type", uploadType);
    formData.set("file", file);
    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/admin/page-sections/upload");
    xhr.upload.addEventListener("progress", (ev) => {
      if (ev.lengthComputable) {
        const pct = Math.round((ev.loaded / ev.total) * 100);
        setUploadProgress(pct);
      } else {
        setUploadProgress((prev) => Math.min(prev + 10, 90));
      }
    });
    xhr.addEventListener("load", async () => {
      try {
        setUploadProgress(100);
        const data = JSON.parse(xhr.responseText || "{}");
        if (xhr.status >= 200 && xhr.status < 300) {
          await refetchAll();
          closeModal();
        } else {
          setError(data?.error ?? "Upload failed.");
        }
      } catch {
        setError("Upload failed.");
      } finally {
        setUploading(false);
        setUploadProgress(0);
        e.target.value = "";
      }
    });
    xhr.addEventListener("error", () => {
      setError("Upload failed.");
      setUploading(false);
      setUploadProgress(0);
      e.target.value = "";
    });
    xhr.addEventListener("abort", () => {
      setUploading(false);
      setUploadProgress(0);
      e.target.value = "";
    });
    xhr.send(formData);
  };

  if (overlayOnly) {
    const btnClass = editLabel
      ? "flex h-11 items-center gap-2 rounded-xl border-2 border-luxury-gold bg-luxury-gold/25 px-3 py-2.5 text-luxury-gold shadow-lg backdrop-blur-sm transition hover:bg-luxury-gold/40 hover:text-white focus:outline-none focus:ring-2 focus:ring-luxury-gold/50"
      : "flex h-9 w-9 items-center justify-center rounded-lg border border-white/20 bg-black/50 text-white/80 backdrop-blur-sm transition hover:bg-black/70 hover:text-white focus:outline-none focus:ring-2 focus:ring-luxury-gold/50";
    const buttons = isAdmin ? (
      <div className="absolute top-3 right-3 z-[10002] flex items-center gap-2">
        {/* Restore: shown only when admin has replaced media; reverts to current/default website assets */}
        {hasCustomMedia && (
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handleRestore();
            }}
            disabled={restoring}
            className={
              editLabel
                ? "flex h-11 items-center gap-2 rounded-xl border-2 border-white/30 bg-black/50 px-3 py-2.5 text-white/90 shadow-lg backdrop-blur-sm transition hover:bg-black/70 hover:text-white focus:outline-none focus:ring-2 focus:ring-luxury-gold/50 disabled:opacity-50"
                : "flex h-9 w-9 items-center justify-center rounded-lg border border-white/20 bg-black/50 text-white/80 backdrop-blur-sm transition hover:bg-black/70 hover:text-white focus:outline-none focus:ring-2 focus:ring-luxury-gold/50 disabled:opacity-50"
            }
            aria-label="Restore to default"
            title="Restore to default video/image"
          >
            <RotateCcw className={editLabel ? "h-5 w-5 flex-shrink-0" : "h-4 w-4"} />
            {editLabel && <span className="text-sm font-medium whitespace-nowrap">Restore</span>}
          </button>
        )}
        <button
          type="button"
          onClick={(e) => handleEditClick(e)}
          className={btnClass}
          aria-label={editLabel ?? "Edit media"}
        >
          <Pencil className={editLabel ? "h-5 w-5 flex-shrink-0" : "h-4 w-4"} />
          {editLabel && <span className="text-sm font-medium whitespace-nowrap">{editLabel}</span>}
        </button>
      </div>
    ) : null;

    const content = (
      <>
        {isAdmin && fullAreaClickable && (
          <div
            className="absolute inset-0 z-[10001] cursor-pointer"
            onMouseDown={setModalOpenAttribute}
            onTouchStart={setModalOpenAttribute}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handleEditClick(e);
            }}
            aria-hidden
          />
        )}
        {buttons}
        {modalOpen &&
          (() => {
            const target = getModalPortalTarget();
            return target
              ? createPortal(
                  <EditableMediaModal
                    onClose={closeModal}
                    type={type}
                    title={editLabel ?? (type === "image" ? "Edit foto" : "Edit video")}
                    fileInputRef={fileInputRef}
                    handleFileChange={handleFileChange}
                    handleRestore={hasCustomMedia ? handleRestore : undefined}
                    restoring={restoring}
                    uploading={uploading}
                    uploadProgress={uploadProgress}
                    error={error}
                  />,
                  target
                )
              : null;
          })()}
      </>
    );

    if (fullAreaClickable) {
      return (
        <div className="absolute inset-0 pointer-events-auto z-[10002]">
          {content}
        </div>
      );
    }
    return content;
  }

  return (
    <div className="relative">
      {sectionsLoading ? (
        <div className="absolute inset-0 bg-luxury-black" aria-hidden />
      ) : (
        <>
          {displayType === "image" && url &&
            (fill ? (
              <Image
                src={url}
                alt={alt}
                fill
                className={className}
                sizes={sizes ?? "100vw"}
                unoptimized={url.startsWith("http")}
              />
            ) : (
              <img
                src={url}
                alt={alt}
                className={className}
              />
            ))}
          {displayType === "video" && url && (
            <video
              src={url}
              className={className}
              poster={poster}
              autoPlay
              loop
              muted
              playsInline
              {...videoAttrs}
            />
          )}
        </>
      )}
      {isAdmin && (
        <div className="absolute top-3 right-3 z-20 flex items-center gap-2">
          {hasCustomMedia && (
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleRestore();
              }}
              disabled={restoring}
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/20 bg-black/50 text-white/80 backdrop-blur-sm transition hover:bg-black/70 hover:text-white focus:outline-none focus:ring-2 focus:ring-luxury-gold/50 disabled:opacity-50"
              aria-label="Restore to default"
              title="Restore to default video/image"
            >
              <RotateCcw className="h-4 w-4" />
            </button>
          )}
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handleEditClick(e);
            }}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/20 bg-black/50 text-white/80 backdrop-blur-sm transition hover:bg-black/70 hover:text-white focus:outline-none focus:ring-2 focus:ring-luxury-gold/50"
            aria-label="Edit media"
          >
            <Pencil className="h-4 w-4" />
          </button>
        </div>
      )}
      {modalOpen &&
        (() => {
          const target = getModalPortalTarget();
          return target
            ? createPortal(
                <EditableMediaModal
                  onClose={closeModal}
                  type={type}
                  title={editLabel ?? (type === "image" ? "Edit foto" : "Edit video")}
                  fileInputRef={fileInputRef}
                  handleFileChange={handleFileChange}
                  handleRestore={hasCustomMedia ? handleRestore : undefined}
                  restoring={restoring}
                  uploading={uploading}
                  uploadProgress={uploadProgress}
                  error={error}
                />,
                target
              )
            : null;
        })()}
    </div>
  );
}

const CMS_MODAL_Z = 100000;
const CMS_MODAL_ROOT_ID = "cms-modal-root";

function getModalPortalTarget(): HTMLElement | null {
  if (typeof document === "undefined" || !document.body) return null;
  return document.getElementById(CMS_MODAL_ROOT_ID) || document.body;
}

/**
 * CMS replace media modal. Used on ALL pages. Portal to #cms-modal-root or body so same stacking as Home edit video.
 * Parent sets data-cms-modal-open before open so PageTransitionOverlay does not blur.
 */
function EditableMediaModal({
  onClose,
  type,
  title = "Replace media",
  fileInputRef,
  handleFileChange,
  handleRestore,
  restoring,
  uploading,
  uploadProgress,
  error,
}: {
  onClose: () => void;
  type: string;
  title?: string;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  handleFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleRestore?: () => void;
  restoring: boolean;
  uploading: boolean;
  uploadProgress: number;
  error: string | null;
}) {
  useEffect(() => {
    const onEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onEscape);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onEscape);
    };
  }, [onClose]);

  // Same precise container for hero, craft cards, and footer (portal to #cms-modal-root or body)
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="editable-media-modal-title"
      data-cms-replace-modal
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: "100vw",
        height: "100dvh",
        zIndex: 1,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
        boxSizing: "border-box",
        backgroundColor: "rgba(0,0,0,0.85)",
        isolation: "isolate",
        pointerEvents: "auto",
      }}
      onClick={onClose}
    >
      <div
        role="document"
        data-cms-replace-modal-inner
        style={{
          position: "absolute",
          left: "50%",
          top: "50%",
          transform: "translate(-50%, -50%)",
          zIndex: 1,
          width: "calc(100vw - 32px)",
          maxWidth: 448,
          minWidth: 280,
          maxHeight: "min(420px, calc(100dvh - 32px))",
          overflow: "auto",
          borderRadius: 16,
          border: "1px solid rgba(255,255,255,0.15)",
          background: "#0a0a0a",
          padding: 24,
          boxSizing: "border-box",
          boxShadow: "0 25px 50px -12px rgba(0,0,0,0.5)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 id="editable-media-modal-title" className="text-lg font-semibold text-white mb-1">
          {title}
        </h3>
        <p className="text-sm text-white/50 mb-4">
          Pilih foto atau video yang ingin ditampilkan. Image: JPEG, PNG, WebP (maks. 3 MB). Video: MP4, WebM (maks. 10 MB).
        </p>
        <input
          ref={fileInputRef as React.RefObject<HTMLInputElement>}
          type="file"
          accept="image/jpeg,image/png,image/webp,video/mp4,video/webm"
          className="hidden"
          onChange={handleFileChange}
        />
        <div
          className="mb-4 rounded-xl border-2 border-dashed border-white/20 bg-white/5 p-6 text-center transition hover:border-luxury-gold/40 hover:bg-white/10"
          onClick={() => fileInputRef.current?.click()}
          onKeyDown={(e) => e.key === "Enter" && fileInputRef.current?.click()}
          role="button"
          tabIndex={0}
          aria-label="Klik untuk memilih file"
        >
          <p className="text-sm font-medium text-white/90 mb-1">Klik untuk memilih file</p>
          <p className="text-xs text-white/50">atau drag & drop foto/video di sini</p>
        </div>
        {uploading && (
          <div className="mb-4">
            <div className="flex justify-between text-xs text-white/60 mb-1">
              <span>Uploading to R2…</span>
              <span>{uploadProgress}%</span>
            </div>
            <div className="h-2 w-full rounded-full bg-white/10 overflow-hidden">
              <div
                className="h-full bg-luxury-gold/80 transition-all duration-300 ease-out"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
          </div>
        )}
        {error && <p className="text-sm text-red-400 mb-2">{error}</p>}
        <div className="flex flex-wrap justify-end gap-2">
          {handleRestore && (
            <button
              type="button"
              onClick={handleRestore}
              disabled={restoring || uploading}
              className="rounded-xl border border-white/20 px-4 py-2 text-sm text-white/80 hover:bg-white/10 disabled:opacity-50 inline-flex items-center gap-2"
            >
              <RotateCcw className="h-4 w-4" />
              {restoring ? "Restoring…" : "Restore original"}
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-white/20 px-4 py-2 text-sm text-white/80 hover:bg-white/10"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="rounded-xl bg-luxury-gold/20 text-luxury-gold px-4 py-2.5 text-sm font-medium hover:bg-luxury-gold/30 disabled:opacity-50"
          >
            {uploading ? `Upload ${uploadProgress}%` : "Pilih file"}
          </button>
        </div>
      </div>
    </div>
  );
}
