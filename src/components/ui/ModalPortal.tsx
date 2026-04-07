"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";

type ModalPortalProps = {
  children: React.ReactNode;
  /** z-index for the portal root container */
  zIndex?: number;
};

/**
 * Renders modal/backdrop into document.body to avoid `position: fixed` being constrained
 * by transformed ancestors (e.g. translateZ(0)), which can cause gaps in the overlay.
 * Also locks body scroll while mounted.
 */
export function ModalPortal({ children, zIndex = 9999 }: ModalPortalProps) {
  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, []);

  if (typeof document === "undefined") return null;

  return createPortal(
    <div style={{ position: "fixed", inset: 0, width: "100vw", height: "100dvh", zIndex }}>
      {children}
    </div>,
    document.body
  );
}

