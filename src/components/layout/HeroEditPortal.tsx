"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { EditableMedia } from "@/components/editable-media";

const EDIT_BUTTON_DELAY_MS = 800;

export type HeroEditPortalProps = {
  page: string;
  section: string;
  type: "image" | "video";
  onUploadDone: () => void;
  /** e.g. "Edit video" or "Edit photo". Defaults by type. */
  editLabel?: string;
};

/**
 * Hero edit button (Edit video / Edit photo):
 * - Portaled to document.body for consistent stacking across pages
 * - Parent controls when this mounts (splash/animation timing)
 * - Smooth opacity+translateY entrance once mounted
 */
export function HeroEditPortal({
  page,
  section,
  type,
  onUploadDone,
  editLabel = type === "video" ? "Edit video" : "Edit photo",
}: HeroEditPortalProps) {
  const [mounted, setMounted] = useState(false);
  const [showEditButton, setShowEditButton] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    const t = setTimeout(() => setShowEditButton(true), EDIT_BUTTON_DELAY_MS);
    return () => clearTimeout(t);
  }, [mounted]);

  if (!mounted || typeof document === "undefined" || !document.body) {
    return null;
  }

  return createPortal(
    <div
      className="fixed top-20 right-4 sm:right-6 z-[10002] pointer-events-auto"
      data-hero-edit-portal
      style={{
        opacity: showEditButton ? 1 : 0,
        transform: showEditButton ? "translateY(0)" : "translateY(-8px)",
        transition:
          "opacity 0.6s cubic-bezier(0.22, 1, 0.36, 1), transform 0.6s cubic-bezier(0.22, 1, 0.36, 1)",
        pointerEvents: showEditButton ? "auto" : "none",
      }}
    >
      <EditableMedia
        page={page}
        section={section}
        type={type}
        overlayOnly
        onUploadDone={onUploadDone}
        editLabel={editLabel}
      />
    </div>,
    document.body
  );
}
