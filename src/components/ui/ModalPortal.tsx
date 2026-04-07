"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";

type ModalPortalProps = {
  children: React.ReactNode;
  /** z-index for the portal root container */
  zIndex?: number;
};

/**
 * Renders modal into document.body. Locks scroll on both html and body while mounted.
 * Requires body/html without transform/filter so position:fixed matches the viewport.
 */
export function ModalPortal({ children, zIndex = 9999 }: ModalPortalProps) {
  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;
    const prevHtmlOverflow = html.style.overflow;
    const prevBodyOverflow = body.style.overflow;
    html.style.overflow = "hidden";
    body.style.overflow = "hidden";
    return () => {
      html.style.overflow = prevHtmlOverflow;
      body.style.overflow = prevBodyOverflow;
    };
  }, []);

  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      style={{
        position: "fixed",
        inset: 0,
        width: "100vw",
        minHeight: "100dvh",
        height: "100%",
        zIndex,
        overscrollBehavior: "contain",
      }}
    >
      {children}
    </div>,
    document.body
  );
}
