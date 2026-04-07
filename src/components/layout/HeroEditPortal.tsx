"use client";

import { useCallback, useEffect, useLayoutEffect, useState } from "react";
import { createPortal } from "react-dom";
import { EditableMedia } from "@/components/editable-media";
import { getViewportPortalRoot, SK_VIEWPORT_HERO_CHROME_Z } from "@/utils/viewportPortalRoot";

const TIMELESS_ANCHOR_ID = "hero-home-timeless-anchor";
/** Gap between button bottom and top of “Timeless” (px) */
const HOME_EDIT_GAP_ABOVE_WORD = 10;

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
 * - Portaled under document.documentElement (viewport root) so body translateZ does not break fixed
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
  /** Home: fixed position above #hero-home-timeless-anchor; null = fallback to top-right */
  const [homeAnchorPos, setHomeAnchorPos] = useState<{
    left: number;
    top: number;
  } | null>(null);

  const updateHomeAnchorPosition = useCallback(() => {
    if (typeof document === "undefined") return;
    const el = document.getElementById(TIMELESS_ANCHOR_ID);
    if (!el) {
      setHomeAnchorPos(null);
      return;
    }
    const rect = el.getBoundingClientRect();
    setHomeAnchorPos({
      left: rect.left + rect.width / 2,
      top: rect.top - HOME_EDIT_GAP_ABOVE_WORD,
    });
  }, []);

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

  useLayoutEffect(() => {
    if (!mounted || performanceMode !== "home") return;
    updateHomeAnchorPosition();
  }, [mounted, performanceMode, updateHomeAnchorPosition, showEditButton]);

  useEffect(() => {
    if (!mounted || performanceMode !== "home") return;
    updateHomeAnchorPosition();
    const onScrollOrResize = () => updateHomeAnchorPosition();
    window.addEventListener("scroll", onScrollOrResize, { passive: true });
    window.addEventListener("resize", onScrollOrResize, { passive: true });
    const el = document.getElementById(TIMELESS_ANCHOR_ID);
    const ro =
      el && typeof ResizeObserver !== "undefined"
        ? new ResizeObserver(() => updateHomeAnchorPosition())
        : null;
    if (el && ro) ro.observe(el);
    return () => {
      window.removeEventListener("scroll", onScrollOrResize);
      window.removeEventListener("resize", onScrollOrResize);
      ro?.disconnect();
    };
  }, [mounted, performanceMode, updateHomeAnchorPosition, showEditButton]);

  const portalMount = typeof document !== "undefined" ? getViewportPortalRoot() : null;
  if (!mounted || typeof document === "undefined" || !portalMount) {
    return null;
  }

  const isHomePerf = performanceMode === "home";
  const useTimelessAnchor = isHomePerf && homeAnchorPos != null;

  return createPortal(
    <div
      className={
        useTimelessAnchor
          ? "fixed flex flex-col items-center gap-2 pointer-events-auto"
          : "fixed top-20 right-4 flex flex-col items-end gap-2 pointer-events-auto sm:right-6"
      }
      data-hero-edit-portal
      style={{
        zIndex: SK_VIEWPORT_HERO_CHROME_Z,
        ...(useTimelessAnchor && homeAnchorPos
          ? {
              left: homeAnchorPos.left,
              top: homeAnchorPos.top,
              right: "auto",
            }
          : {}),
        opacity: showEditButton ? 1 : 0,
        transform: useTimelessAnchor
          ? "translate(-50%, -100%) translateZ(0)"
          : isHomePerf
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
    portalMount
  );
}
