"use client";

import { usePathname } from "next/navigation";
import { useRef, useEffect, useState } from "react";
import { getR2UrlClient } from "@/utils/r2-url";
import { usePageSections } from "@/hooks/usePageSections";
import { useReliableVideoAutoplay } from "@/hooks/useReliableVideoAutoplay";
import { VideoLoadGuard } from "@/components/section-media/SectionMediaLoadGuard";
import { HeroEditPortal } from "@/components/layout/HeroEditPortal";

const HERO_VIDEO_FALLBACK = "/videos/hero/hero-background.mp4";

/** Delay (ms) after splash finishes before allowing edit button.
 *  Must exceed the hero entrance GSAP animation (~2.7s) + content fade (0.3s). */
const POST_SPLASH_BUFFER_MS = 3500;

/** Delay (ms) on subsequent visits (splash already shown) before allowing edit button.
 *  Hero entrance animation still plays (~2.7s), so we wait for it. */
const SUBSEQUENT_VISIT_BUFFER_MS = 3200;

function isHomePath(pathname: string | null): boolean {
  const path = (pathname ?? "").replace(/\/$/, "").trim() || "/";
  return path === "/" || path === "/en" || path === "/id";
}

/**
 * Detects whether the splash screen has completed AND all entrance animations
 * have settled, so the edit button can appear without overlapping with content transitions.
 */
function useSplashComplete(): boolean {
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const alreadyShown =
      sessionStorage.getItem("splashShown") === "true" ||
      document.body.classList.contains("splash-complete");

    if (alreadyShown) {
      const t = setTimeout(() => setDone(true), SUBSEQUENT_VISIT_BUFFER_MS);
      return () => clearTimeout(t);
    }

    let timer: ReturnType<typeof setTimeout> | null = null;

    const observer = new MutationObserver(() => {
      if (document.body.classList.contains("splash-complete")) {
        observer.disconnect();
        timer = setTimeout(() => setDone(true), POST_SPLASH_BUFFER_MS);
      }
    });

    observer.observe(document.body, {
      attributes: true,
      attributeFilter: ["class"],
    });

    return () => {
      observer.disconnect();
      if (timer) clearTimeout(timer);
    };
  }, []);

  return done;
}

/**
 * Persistent hero video for Home. Rendered in layout so it does NOT unmount
 * when navigating away. Video URL from page-sections (CMS) or fallback.
 * Admin sees edit icon only after splash + fade-in are fully complete.
 */
export function PersistentHomeHeroVideo() {
  const pathname = usePathname();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isHome, setIsHome] = useState(false);
  const splashComplete = useSplashComplete();
  const { sections, loading: sectionsLoading, refetch } = usePageSections("home");
  const heroUrl = sections.hero?.url ?? getR2UrlClient(HERO_VIDEO_FALLBACK);
  const heroVersion = sections.hero?.version;

  // Maximize autoplay reliability on mobile/desktop.
  useReliableVideoAutoplay(videoRef);

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
      {sectionsLoading ? (
        <div className="absolute inset-0 bg-luxury-black" aria-hidden />
      ) : isHome ? (
        <div className="absolute inset-0 overflow-hidden">
          <div
            className="absolute left-1/2 top-1/2 h-[104%] w-[104%] min-h-[104%] min-w-[104%] -translate-x-1/2 -translate-y-1/2 origin-center scale-100 md:left-0 md:top-0 md:h-full md:w-full md:min-h-0 md:min-w-0 md:translate-x-0 md:translate-y-0 md:scale-100"
            aria-hidden
          >
            <VideoLoadGuard
              ref={videoRef}
              url={heroUrl}
              version={heroVersion}
              forcePoster={false}
              containerClassName="absolute inset-0 min-w-full min-h-full w-full h-full"
              className="absolute left-1/2 top-1/2 min-w-full min-h-full w-full h-full -translate-x-1/2 -translate-y-1/2 object-cover"
              style={{ pointerEvents: "none" }}
              autoPlay
              loop
              muted
              playsInline
              preload="auto"
              disablePictureInPicture
              disableRemotePlayback
              onContextMenu={(e) => e.preventDefault()}
            />
          </div>
        </div>
      ) : (
        <div className="absolute inset-0 bg-luxury-black" aria-hidden />
      )}
      {/* Vignette / dark motif - Home only */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/38 via-black/12 to-black/45 md:from-black/55 md:via-black/25 md:to-black/60 pointer-events-none" />
      <div className="absolute inset-0 bg-gradient-to-r from-black/45 via-transparent to-black/28 md:from-black/65 md:to-black/40 pointer-events-none" />
      {/* Edit video: only after splash + fade-in are fully complete */}
      {isHome && splashComplete && (
        <HeroEditPortal
          page="home"
          section="hero"
          type="video"
          onUploadDone={refetch}
          editLabel="Edit video"
        />
      )}
    </div>
  );
}
