"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";

type ModalPortalProps = {
  children: React.ReactNode;
  /** z-index for the portal root container */
  zIndex?: number;
};

/**
 * Renders modal/backdrop into document.body so it sits above the app tree.
 * Locks scroll on both html and body while mounted.
 * Root is a viewport-fixed, scrollable shell (max 100dvh) so tall forms scroll inside
 * the overlay instead of trapping users when body had transform/filter ancestors.
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
      role="presentation"
      style={{
        position: "fixed",
        inset: 0,
        width: "100%",
        maxHeight: "100dvh",
        minHeight: "100dvh",
        zIndex,
        overflowX: "hidden",
        overflowY: "auto",
        overscrollBehavior: "contain",
        WebkitOverflowScrolling: "touch",
      }}
    >
      {children}
    </div>,
    document.body
  );
}
