"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { Pencil } from "lucide-react";
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
}: EditableMediaProps) {
  const isAdmin = useIsAdmin();
  const { sections, refetch } = usePageSections(page);
  const refetchAll = async () => {
    await refetch();
    onUploadDone?.();
  };
  const [modalOpen, setModalOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const url = sections[section]?.url ?? fallbackUrl ?? (type === "image" ? getR2UrlClient("/images/placeholder-hero.jpg") : undefined);

  const handleEditClick = () => {
    if (!isAdmin) return;
    setError(null);
    setModalOpen(true);
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
    return (
      <>
        {isAdmin && (
          <button
            type="button"
            onClick={handleEditClick}
            className={`z-20 ${btnClass}`}
            aria-label={editLabel ?? "Edit media"}
          >
            <Pencil className={editLabel ? "h-5 w-5 flex-shrink-0" : "h-4 w-4"} />
            {editLabel && <span className="text-sm font-medium whitespace-nowrap">{editLabel}</span>}
          </button>
        )}
        {modalOpen && (
          <EditableMediaModal
            onClose={() => setModalOpen(false)}
            type={type}
            fileInputRef={fileInputRef}
            handleFileChange={handleFileChange}
            uploading={uploading}
            error={error}
          />
        )}
      </>
    );
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
        <button
          type="button"
          onClick={handleEditClick}
          className="absolute top-3 right-3 z-20 flex h-9 w-9 items-center justify-center rounded-lg border border-white/20 bg-black/50 text-white/80 backdrop-blur-sm transition hover:bg-black/70 hover:text-white focus:outline-none focus:ring-2 focus:ring-luxury-gold/50"
          aria-label="Edit media"
        >
          <Pencil className="h-4 w-4" />
        </button>
      )}
      {modalOpen && (
        <EditableMediaModal
          onClose={() => setModalOpen(false)}
          type={type}
          fileInputRef={fileInputRef}
          handleFileChange={handleFileChange}
          uploading={uploading}
          error={error}
        />
      )}
    </div>
  );
}

function EditableMediaModal({
  onClose,
  type,
  fileInputRef,
  handleFileChange,
  uploading,
  error,
}: {
  onClose: () => void;
  type: string;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  handleFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  uploading: boolean;
  error: string | null;
}) {
  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl border border-white/15 bg-[#0a0a0a] p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-lg font-semibold text-white mb-4">
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
        <div className="flex justify-end gap-2">
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
