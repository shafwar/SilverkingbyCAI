"use client";

import { usePathname } from "next/navigation";
import { useRef, useEffect, useState } from "react";
import { getR2UrlClient } from "@/utils/r2-url";
import { usePageSections } from "@/hooks/usePageSections";
import { EditableMedia } from "@/components/editable-media";

const HERO_VIDEO_FALLBACK = "/videos/hero/hero-background.mp4";

/**
 * Persistent hero video for Home. Rendered in layout so it does NOT unmount
 * when navigating away. Video URL from page-sections (CMS) or fallback.
 * Admin sees edit icon and can replace video (upload to R2).
 */
export function PersistentHomeHeroVideo() {
  const pathname = usePathname();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isHome, setIsHome] = useState(false);
  const { sections, refetch } = usePageSections("home");
  const src = sections.hero?.url ?? getR2UrlClient(HERO_VIDEO_FALLBACK);

  useEffect(() => {
    const path = pathname ?? "";
    const home = path === "" || path === "/" || path === "/en" || path === "/id";
    setIsHome(home);
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
      className="fixed inset-0 z-0 pointer-events-none"
      style={{
        visibility: isHome ? "visible" : "hidden",
        opacity: isHome ? 1 : 0,
        transition: "opacity 0.25s ease",
      }}
    >
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
        className="absolute inset-0 w-full h-full object-cover"
        style={{
          pointerEvents: "none",
          width: "100vw",
          height: "100vh",
        }}
        onContextMenu={(e) => e.preventDefault()}
      >
        <source src={src} type="video/mp4" />
      </video>
      {/* Vignette / dark motif - Home only */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/55 via-black/25 to-black/60 pointer-events-none" />
      <div className="absolute inset-0 bg-gradient-to-r from-black/65 via-transparent to-black/40 pointer-events-none" />
      {isHome && (
        <div className="absolute inset-0 pointer-events-none z-10">
          {/* Icon pensil di bawah navbar agar terlihat di area video */}
          <div className="absolute top-20 right-4 sm:right-6 pointer-events-auto z-[101]">
            <EditableMedia
              page="home"
              section="hero"
              type="video"
              overlayOnly
              onUploadDone={refetch}
            />
          </div>
        </div>
      )}
    </div>
  );
}
