"use client";

import { useRef, useState, useEffect } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import { Pencil, RotateCcw } from "lucide-react";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { usePageSections } from "@/hooks/usePageSections";
import { getR2UrlClient } from "@/utils/r2-url";

const MAX_IMAGE_BYTES = 3 * 1024 * 1024;
const MAX_VIDEO_BYTES = 80 * 1024 * 1024;

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
  const { sections, refetch } = usePageSections(page);
  const refetchAll = async () => {
    await refetch();
    onUploadDone?.();
  };
  const [modalOpen, setModalOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const url = sections[section]?.url ?? fallbackUrl ?? (type === "image" ? getR2UrlClient("/images/placeholder-hero.jpg") : undefined);
  const hasCustomMedia = Boolean(sections[section]);

  const handleEditClick = () => {
    if (!isAdmin) return;
    setError(null);
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
      setModalOpen(false);
      await refetchAll();
    } catch {
      setError("Restore failed.");
    } finally {
      setRestoring(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const limit = type === "image" ? MAX_IMAGE_BYTES : MAX_VIDEO_BYTES;
    if (file.size > limit) {
      setError(type === "image" ? "Max 3 MB." : "Max 80 MB.");
      e.target.value = "";
      return;
    }
    setError(null);
    setUploading(true);
    try {
      const formData = new FormData();
      formData.set("page", page);
      formData.set("section", section);
      formData.set("type", type);
      formData.set("file", file);
      const res = await fetch("/api/admin/page-sections/upload", {
        method: "POST",
        body: formData,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data?.error ?? "Upload failed.");
        return;
      }
      await refetchAll();
      setModalOpen(false);
    } catch {
      setError("Upload failed.");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  if (overlayOnly) {
    const btnClass = editLabel
      ? "flex h-11 items-center gap-2 rounded-xl border-2 border-luxury-gold bg-luxury-gold/25 px-3 py-2.5 text-luxury-gold shadow-lg backdrop-blur-sm transition hover:bg-luxury-gold/40 hover:text-white focus:outline-none focus:ring-2 focus:ring-luxury-gold/50"
      : "flex h-9 w-9 items-center justify-center rounded-lg border border-white/20 bg-black/50 text-white/80 backdrop-blur-sm transition hover:bg-black/70 hover:text-white focus:outline-none focus:ring-2 focus:ring-luxury-gold/50";
    const buttons = isAdmin ? (
      <div className="absolute top-3 right-3 z-[10002] flex items-center gap-2">
        {hasCustomMedia && (
          <button
            type="button"
            onClick={handleRestore}
            disabled={restoring}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/20 bg-black/50 text-white/80 backdrop-blur-sm transition hover:bg-black/70 hover:text-white focus:outline-none focus:ring-2 focus:ring-luxury-gold/50 disabled:opacity-50"
            aria-label="Restore original"
            title="Restore original"
          >
            <RotateCcw className="h-4 w-4" />
          </button>
        )}
        <button
          type="button"
          onClick={handleEditClick}
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
            onClick={handleEditClick}
            aria-hidden
          />
        )}
        {buttons}
        {modalOpen &&
          typeof document !== "undefined" &&
          createPortal(
            <EditableMediaModal
              onClose={() => setModalOpen(false)}
              type={type}
              fileInputRef={fileInputRef}
              handleFileChange={handleFileChange}
              handleRestore={hasCustomMedia ? handleRestore : undefined}
              restoring={restoring}
              uploading={uploading}
              error={error}
            />,
            document.body
          )}
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
      {type === "image" && url &&
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
      {type === "video" && url && (
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
      {isAdmin && (
        <div className="absolute top-3 right-3 z-20 flex items-center gap-2">
          {hasCustomMedia && (
            <button
              type="button"
              onClick={handleRestore}
              disabled={restoring}
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/20 bg-black/50 text-white/80 backdrop-blur-sm transition hover:bg-black/70 hover:text-white focus:outline-none focus:ring-2 focus:ring-luxury-gold/50 disabled:opacity-50"
              aria-label="Restore original"
              title="Restore original"
            >
              <RotateCcw className="h-4 w-4" />
            </button>
          )}
          <button
            type="button"
            onClick={handleEditClick}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/20 bg-black/50 text-white/80 backdrop-blur-sm transition hover:bg-black/70 hover:text-white focus:outline-none focus:ring-2 focus:ring-luxury-gold/50"
            aria-label="Edit media"
          >
            <Pencil className="h-4 w-4" />
          </button>
        </div>
      )}
      {modalOpen &&
        typeof document !== "undefined" &&
        createPortal(
          <EditableMediaModal
            onClose={() => setModalOpen(false)}
            type={type}
            fileInputRef={fileInputRef}
            handleFileChange={handleFileChange}
            handleRestore={hasCustomMedia ? handleRestore : undefined}
            restoring={restoring}
            uploading={uploading}
            error={error}
          />,
          document.body
        )}
    </div>
  );
}

function EditableMediaModal({
  onClose,
  type,
  fileInputRef,
  handleFileChange,
  handleRestore,
  restoring,
  uploading,
  error,
}: {
  onClose: () => void;
  type: string;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  handleFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleRestore?: () => void;
  restoring: boolean;
  uploading: boolean;
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
      document.body.style.overflow = "";
    };
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="editable-media-modal-title"
      className="fixed inset-0 z-[10003] flex items-center justify-center p-4"
      style={{
        left: 0,
        right: 0,
        top: 0,
        bottom: 0,
        backgroundColor: "rgba(0,0,0,0.75)",
        backdropFilter: "blur(8px)",
      }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl border border-white/15 bg-[#0a0a0a] p-6 shadow-2xl"
        style={{
          maxHeight: "calc(100vh - 2rem)",
          overflow: "auto",
          margin: "auto",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 id="editable-media-modal-title" className="text-lg font-semibold text-white mb-4">
          Replace {type === "image" ? "image" : "video"}
        </h3>
        <input
          ref={fileInputRef as React.RefObject<HTMLInputElement>}
          type="file"
          accept={type === "image" ? "image/jpeg,image/png,image/webp" : "video/mp4,video/webm"}
          className="hidden"
          onChange={handleFileChange}
        />
        <p className="text-sm text-white/60 mb-4">
          {type === "image" ? "JPEG, PNG or WebP. Max 3 MB." : "MP4 or WebM. Max 80 MB."}
        </p>
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
            className="rounded-xl bg-luxury-gold/20 text-luxury-gold px-4 py-2 text-sm font-medium hover:bg-luxury-gold/30 disabled:opacity-50"
          >
            {uploading ? "Uploading…" : "Choose file"}
          </button>
        </div>
      </div>
    </div>
  );
}
