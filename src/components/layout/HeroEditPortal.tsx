"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { EditableMedia } from "@/components/editable-media";

const EDIT_BUTTON_DELAY_MS = 800;
/** Home: defer admin chrome until main thread idle + shorter motion (less jank on fullscreen video). */
const HOME_EDIT_DEFER_IDLE_MS = 2200;
const HOME_EDIT_IDLE_TIMEOUT_MS = 4000;

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
    let minElapsed = false;
    let idleElapsed = false;
    const tryReveal = () => {
      if (cancelled || !minElapsed || !idleElapsed) return;
      setShowEditButton(true);
    };
    const tMin = setTimeout(() => {
      minElapsed = true;
      tryReveal();
    }, EDIT_BUTTON_DELAY_MS);
    const w = globalThis as Window & typeof globalThis;
    let idleId: number | null = null;
    const markIdle = () => {
      if (cancelled) return;
      idleElapsed = true;
      tryReveal();
    };
    let idleFallbackTimer: ReturnType<typeof setTimeout> | null = null;
    if ("requestIdleCallback" in w && typeof w.requestIdleCallback === "function") {
      idleId = w.requestIdleCallback(markIdle, { timeout: HOME_EDIT_IDLE_TIMEOUT_MS });
    } else {
      idleFallbackTimer = setTimeout(markIdle, HOME_EDIT_DEFER_IDLE_MS);
    }
    return () => {
      cancelled = true;
      clearTimeout(tMin);
      if (idleId != null && "cancelIdleCallback" in w) {
        w.cancelIdleCallback(idleId);
      }
      if (idleFallbackTimer != null) clearTimeout(idleFallbackTimer);
    };
  }, [mounted, performanceMode]);

  if (!mounted || typeof document === "undefined" || !document.body) {
    return null;
  }

  const isHomePerf = performanceMode === "home";

  return createPortal(
    <div
      className="fixed top-20 right-4 sm:right-6 z-[10002] pointer-events-auto"
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
        contain: isHomePerf ? ("layout style paint" as const) : undefined,
        isolation: isHomePerf ? ("isolate" as const) : undefined,
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
