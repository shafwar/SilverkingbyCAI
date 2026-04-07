"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";
import { getViewportPortalRoot, SK_VIEWPORT_MODAL_Z } from "@/utils/viewportPortalRoot";

type ModalPortalProps = {
  children: React.ReactNode;
  /** z-index for the portal root container */
  zIndex?: number;
};

/**
 * Renders modal into a root under `document.documentElement` so `position: fixed`
 * stays viewport-relative even when `body` has `transform: translateZ(0)`.
 * Also locks body scroll while mounted.
 */
export function ModalPortal({ children, zIndex = SK_VIEWPORT_MODAL_Z }: ModalPortalProps) {
  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, []);

  if (typeof document === "undefined") return null;

  const mount = getViewportPortalRoot() ?? document.body;

  return createPortal(
    <div
      style={{
        position: "fixed",
        inset: 0,
        width: "100vw",
        height: "100dvh",
        zIndex,
        pointerEvents: "auto",
      }}
    >
      {children}
    </div>,
    mount
  );
}

