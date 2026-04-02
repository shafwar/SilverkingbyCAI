"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { EditableMedia } from "@/components/editable-media";
import { useIsAdmin } from "@/hooks/useIsAdmin";

const EDIT_BUTTON_DELAY_MS = 800;
/** Home: defer mounting admin chrome so background video can decode & settle (reduces early stutter). */
const HOME_ADMIN_CHROME_MOUNT_MS = 3200;

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
 * - Home: no portal until admin + delay (avoids competing with video startup)
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
  const isAdmin = useIsAdmin();
  /** Default pages: mount chrome immediately; home: wait until delay elapses (see effect). */
  const [mountChrome, setMountChrome] = useState(() => performanceMode !== "home");
  const [showEditButton, setShowEditButton] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted || performanceMode === "home") return;
    const t = setTimeout(() => setShowEditButton(true), EDIT_BUTTON_DELAY_MS);
    return () => clearTimeout(t);
  }, [mounted, performanceMode]);

  useEffect(() => {
    if (!mounted || performanceMode !== "home") return;
    if (!isAdmin) return;
    let cancelled = false;
    const t = setTimeout(() => {
      if (!cancelled) setMountChrome(true);
    }, HOME_ADMIN_CHROME_MOUNT_MS);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [mounted, performanceMode, isAdmin]);

  if (!mounted || typeof document === "undefined" || !document.body) {
    return null;
  }

  const isHomePerf = performanceMode === "home";

  if (isHomePerf) {
    if (!isAdmin || !mountChrome) {
      return null;
    }
  }

  const editable = (
    <EditableMedia
      page={page}
      section={section}
      type={type}
      overlayOnly
      onUploadDone={onUploadDone}
      editLabel={editLabel}
      reduceOverlayChromeCost={isHomePerf}
    />
  );

  if (isHomePerf) {
    return createPortal(
      <div
        className="pointer-events-none fixed inset-x-0 top-0 z-[10002]"
        data-hero-edit-portal
      >
        <div className="pointer-events-auto mx-auto flex w-full max-w-[1440px] justify-end px-4 pt-[5.25rem] sm:px-6 md:px-10 lg:px-16 xl:px-20">
          <div className="flex flex-col items-end gap-2" style={{ maxWidth: "min(100%, 22rem)" }}>
            {editable}
          </div>
        </div>
      </div>,
      document.body
    );
  }

  return createPortal(
    <div
      className="fixed top-20 right-4 z-[10002] flex flex-col items-end gap-2 pointer-events-auto sm:right-6"
      data-hero-edit-portal
      style={{
        opacity: showEditButton ? 1 : 0,
        transform: showEditButton ? "translateY(0)" : "translateY(-8px)",
        transition:
          "opacity 0.6s cubic-bezier(0.22, 1, 0.36, 1), transform 0.6s cubic-bezier(0.22, 1, 0.36, 1)",
        pointerEvents: showEditButton ? "auto" : "none",
        maxWidth: "calc(100vw - 2rem)",
      }}
    >
      {editable}
    </div>,
    document.body
  );
}
