"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { EditableMedia } from "@/components/editable-media";

const EDIT_BUTTON_DELAY_MS = 800;
/** Home: earliest of idle callback or this delay (first wins); idle timeout caps wait on busy threads. */
const HOME_EDIT_MAX_WAIT_MS = 1200;
const HOME_EDIT_IDLE_CALLBACK_TIMEOUT_MS = 2200;

export type HeroEditPortalProps = {
  page: string;
  section: string;
  type: "image" | "video";
  onUploadDone: () => void;
  /** e.g. "Edit video" or "Edit photo". Defaults by type. */
  editLabel?: string;
  /** Lighter portal timing + chrome for persistent home hero (admin video jank). */
  performanceMode?: "home" | "default";
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
  performanceMode = "default",
}: HeroEditPortalProps) {
  const [mounted, setMounted] = useState(false);
  const [showEditButton, setShowEditButton] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    if (performanceMode !== "home") {
      const t = setTimeout(() => setShowEditButton(true), EDIT_BUTTON_DELAY_MS);
      return () => clearTimeout(t);
    }
    let cancelled = false;
    let done = false;
    const reveal = () => {
      if (cancelled || done) return;
      done = true;
      setShowEditButton(true);
    };
    const tMax = setTimeout(reveal, HOME_EDIT_MAX_WAIT_MS);
    const w = globalThis as Window & typeof globalThis;
    let idleId: number | null = null;
    if ("requestIdleCallback" in w && typeof w.requestIdleCallback === "function") {
      idleId = w.requestIdleCallback(() => reveal(), {
        timeout: HOME_EDIT_IDLE_CALLBACK_TIMEOUT_MS,
      });
    }
    return () => {
      cancelled = true;
      clearTimeout(tMax);
      if (idleId != null && "cancelIdleCallback" in w) {
        w.cancelIdleCallback(idleId);
      }
    };
  }, [mounted, performanceMode]);

  if (!mounted || typeof document === "undefined" || !document.body) {
    return null;
  }

  const isHomePerf = performanceMode === "home";

  return createPortal(
    <div
      className="fixed top-20 right-4 z-[10002] flex flex-col items-end gap-2 pointer-events-auto sm:right-6"
      data-hero-edit-portal
      style={{
        opacity: showEditButton ? 1 : 0,
        transform: isHomePerf
          ? "translateZ(0)"
          : showEditButton
            ? "translateY(0)"
            : "translateY(-8px)",
        transition: isHomePerf
          ? "opacity 0.2s ease-out"
          : "opacity 0.6s cubic-bezier(0.22, 1, 0.36, 1), transform 0.6s cubic-bezier(0.22, 1, 0.36, 1)",
        pointerEvents: showEditButton ? "auto" : "none",
        maxWidth: "calc(100vw - 2rem)",
      }}
    >
      <EditableMedia
        page={page}
        section={section}
        type={type}
        overlayOnly
        onUploadDone={onUploadDone}
        editLabel={editLabel}
        reduceOverlayChromeCost={isHomePerf}
      />
    </div>,
    document.body
  );
}
