"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";

type ModalPortalProps = {
  children: React.ReactNode;
  /** z-index for the portal root container */
  zIndex?: number;
};

/**
 * Renders modal/backdrop into document.body. Requires body NOT to use `transform`,
 * otherwise `position: fixed` is tied to body and the overlay appears at the document
 * top (e.g. hero) while scroll is locked — see globals.css body rules.
 * Locks document scroll while mounted (html + body for iOS).
 */
export function ModalPortal({ children, zIndex = 9999 }: ModalPortalProps) {
  useEffect(() => {
    const prevBodyOverflow = document.body.style.overflow;
    const prevHtmlOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevBodyOverflow;
      document.documentElement.style.overflow = prevHtmlOverflow;
    };
  }, []);

  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      className="pointer-events-auto"
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: "100%",
        minHeight: "100dvh",
        zIndex,
        overscrollBehavior: "contain",
      }}
    >
      {children}
    </div>,
    document.body
  );
}

