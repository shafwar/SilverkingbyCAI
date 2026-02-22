"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { EditableMedia } from "@/components/editable-media";

const EDIT_BUTTON_DELAY_MS = 2000;

export type HeroEditPortalProps = {
  page: string;
  section: string;
  type: "image" | "video";
  onUploadDone: () => void;
  /** e.g. "Edit video" or "Edit photo". Defaults by type. */
  editLabel?: string;
};

/**
 * Hero edit button (Edit video / Edit photo) with the same pattern as Home:
 * - Portaled to document.body so same stacking and behavior on all pages
 * - Shown after 2s delay so it doesn’t appear on first paint
 * - Same modal (Replace video / Replace image) from EditableMedia
 * Use on: Home, What we do, Authenticity, Products, Distributor, About us.
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

  if (!mounted || !showEditButton || typeof document === "undefined" || !document.body) {
    return null;
  }

  return createPortal(
    <div
      className="fixed top-20 right-4 sm:right-6 z-[10002] pointer-events-auto animate-fade-in"
      data-hero-edit-portal
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
