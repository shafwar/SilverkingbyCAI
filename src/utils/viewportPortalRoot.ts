/**
 * Portal mount for overlays that must use the **visual viewport** as the
 * `position: fixed` containing block.
 *
 * `body` uses `transform: translateZ(0)` for smoother scrolling; that makes
 * any `fixed` node rendered *inside* `body` use `body` as its containing block
 * (wrong modal position, hero controls that “scroll away”). Mounting those
 * overlays under `document.documentElement` avoids `body`’s transform while
 * keeping GPU promotion on `body`.
 */
const SK_VIEWPORT_PORTAL_ID = "sk-viewport-portal-root";

export function getViewportPortalRoot(): HTMLElement | null {
  if (typeof document === "undefined" || !document.documentElement) return null;

  let el = document.getElementById(SK_VIEWPORT_PORTAL_ID) as HTMLElement | null;
  if (!el) {
    el = document.createElement("div");
    el.id = SK_VIEWPORT_PORTAL_ID;
    el.setAttribute("data-sk-viewport-portal", "true");
    el.style.pointerEvents = "none";
    document.documentElement.appendChild(el);
  }
  return el;
}
