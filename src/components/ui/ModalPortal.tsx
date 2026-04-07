"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";

type ModalPortalProps = {
  children: React.ReactNode;
  /** z-index for the portal root container */
  zIndex?: number;
};

const VIEWPORT_MODAL_HOST_ID = "sk-viewport-modal-host";

/**
 * Host under `document.documentElement` (sibling of `body`), not under `body`.
 * `body` uses `transform: translateZ(0)` in globals for GPU; that makes any
 * `position: fixed` inside `body` use the body as containing block → modals
 * appear at the wrong scroll position and scroll-lock feels like a freeze.
 * Porting here keeps `fixed` relative to the real viewport without changing global CSS.
 */
function getOrCreateViewportModalHost(): HTMLElement {
  let el = document.getElementById(VIEWPORT_MODAL_HOST_ID);
  if (!el) {
    el = document.createElement("div");
    el.id = VIEWPORT_MODAL_HOST_ID;
    document.documentElement.appendChild(el);
  }
  return el;
}

/**
 * Renders modal into a viewport-level host + locks document scroll while mounted.
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

  const host = getOrCreateViewportModalHost();

  return createPortal(
    <div
      style={{
        position: "fixed",
        inset: 0,
        width: "100%",
        minHeight: "100dvh",
        zIndex,
        overflow: "auto",
        overscrollBehavior: "contain",
        WebkitOverflowScrolling: "touch",
      }}
    >
      {children}
    </div>,
    host
  );
}

