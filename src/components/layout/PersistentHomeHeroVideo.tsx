"use client";

import { usePathname } from "next/navigation";
import { useRef, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { getR2UrlClient } from "@/utils/r2-url";
import { usePageSections } from "@/hooks/usePageSections";
import { EditableMedia } from "@/components/editable-media";

const HERO_VIDEO_FALLBACK = "/videos/hero/hero-background.mp4";

function isHomePath(pathname: string | null): boolean {
  const path = (pathname ?? "").replace(/\/$/, "").trim() || "/";
  return path === "/" || path === "/en" || path === "/id";
}

/**
 * Persistent hero video for Home. Rendered in layout so it does NOT unmount
 * when navigating away. Video URL from page-sections (CMS) or fallback.
 * Admin sees edit icon and can replace video (upload to R2).
 */
export function PersistentHomeHeroVideo() {
  const pathname = usePathname();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isHome, setIsHome] = useState(false);
  const [mounted, setMounted] = useState(false);
  const { sections, refetch } = usePageSections("home");
  const src = sections.hero?.url ?? getR2UrlClient(HERO_VIDEO_FALLBACK);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    setIsHome(isHomePath(pathname));
  }, [pathname]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (isHome) {
      video.play().catch(() => {});
    } else {
      video.pause();
    }
  }, [isHome]);

  return (
    <div
      aria-hidden="true"
      className="fixed inset-0 z-0 min-h-dvh pointer-events-none overflow-hidden"
      style={{
        visibility: isHome ? "visible" : "hidden",
        opacity: isHome ? 1 : 0,
        transition: "opacity 0.25s ease",
      }}
    >
      {/* Full viewport cover on all devices: no black gaps on mobile */}
      <video
        ref={videoRef}
        key={src}
        autoPlay
        loop
        muted
        playsInline
        preload="metadata"
        disablePictureInPicture
        disableRemotePlayback
        className="absolute left-1/2 top-1/2 min-w-full min-h-full w-full h-full -translate-x-1/2 -translate-y-1/2 object-cover"
        style={{
          pointerEvents: "none",
        }}
        onContextMenu={(e) => e.preventDefault()}
      >
        <source src={src} type="video/mp4" />
      </video>
      {/* Vignette / dark motif - Home only */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/55 via-black/25 to-black/60 pointer-events-none" />
      <div className="absolute inset-0 bg-gradient-to-r from-black/65 via-transparent to-black/40 pointer-events-none" />
      {/* Edit video button: portal to body so always above main content (z-1), only after client mount */}
      {mounted &&
        isHome &&
        typeof document !== "undefined" &&
        document.body &&
        createPortal(
          <div
            className="fixed top-20 right-4 sm:right-6 z-[10002] pointer-events-auto"
            data-home-edit-video
          >
            <EditableMedia
              page="home"
              section="hero"
              type="video"
              overlayOnly
              onUploadDone={refetch}
              editLabel="Edit video"
            />
          </div>,
          document.body
        )}
    </div>
  );
}
