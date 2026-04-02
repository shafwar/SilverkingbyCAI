"use client";

import { usePathname } from "next/navigation";
import { useRef, useEffect, useState, useMemo } from "react";
import { getR2UrlClient } from "@/utils/r2-url";
import { proxiedHeroVideoSrc } from "@/utils/hero-video-url";
import { usePageSections } from "@/hooks/usePageSections";
import { usePageMedia } from "@/hooks/usePageMedia";
import { useShouldLoadHeroVideo } from "@/hooks/useShouldLoadHeroVideo";
import { useReliableVideoAutoplay } from "@/hooks/useReliableVideoAutoplay";
import { VideoLoadGuard } from "@/components/section-media/SectionMediaLoadGuard";
import { HeroEditPortal } from "@/components/layout/HeroEditPortal";
import { HomeHeroSectionsContext } from "@/components/layout/HomeHeroSectionsContext";

const HERO_VIDEO_FALLBACK = "/videos/hero/hero-background.mp4";

/** Delay before showing hero edit affordance only — keep minimal so UI is not blocked */
const POST_SPLASH_BUFFER_MS = 400;
const SUBSEQUENT_VISIT_BUFFER_MS = 0;

function isHomePath(pathname: string | null): boolean {
  const path = (pathname ?? "").replace(/\/$/, "").trim() || "/";
  return path === "/" || path === "/en" || path === "/id";
}

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
 * Persistent hero video for Home. URL from page-sections (CMS) or fallback.
 * Poster from PageMedia hero image when present — no CMS workflow change.
 */
function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => setReduced(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  return reduced;
}

export function PersistentHomeHeroVideo() {
  const pathname = usePathname();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isHome, setIsHome] = useState(() => isHomePath(pathname));
  /** Once user has opened home, keep <video> mounted (pause when away) — avoids re-decode, blank, and transition jank on SPA return */
  const [everHome, setEverHome] = useState(() => isHomePath(pathname));
  const splashComplete = useSplashComplete();
  const prefersReducedMotion = usePrefersReducedMotion();
  const shouldLoadHeroVideo = useShouldLoadHeroVideo();
  const { sections, refetch } = usePageSections("home");
  const { data: pageMedia } = usePageMedia("home");
  const homeSectionsBridge = useMemo(() => ({ sections, refetch }), [sections, refetch]);

  const heroUrl = sections.hero?.url ?? getR2UrlClient(HERO_VIDEO_FALLBACK);
  const heroVersion = sections.hero?.version;
  /** Same-origin /api/hero-video for R2 — avoids decoder showing a flash of cached frames when the object is replaced. */
  const heroVideoPlayUrl = useMemo(() => proxiedHeroVideoSrc(heroUrl), [heroUrl]);
  /** Non-CMS fallback has no section version; stable numeric version keeps cache-bust predictable if default asset changes. */
  const effectiveHeroVideoVersion = sections.hero?.url != null ? heroVersion : 1;

  /** Static fallback so poster + gradient never sit on an invisible layer (fixes “black hero” on slow JS / splash) */
  const posterUrl =
    pageMedia?.heroImageUrl && pageMedia.heroImageUrl.length > 0
      ? pageMedia.heroImageUrl
      : "/images/hero-fallback.jpg";

  useReliableVideoAutoplay(videoRef, { mode: "background" });

  useEffect(() => {
    const home = isHomePath(pathname);
    setIsHome(home);
    if (home) setEverHome(true);
  }, [pathname]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (!isHome) {
      video.pause();
      return;
    }
    void video.play().catch(() => {});
  }, [isHome]);

  /** bfcache / iOS: resume after back-forward */
  useEffect(() => {
    const onPageShow = (e: PageTransitionEvent) => {
      if (!e.persisted || !isHome) return;
      const v = videoRef.current;
      if (v) void v.play().catch(() => {});
    };
    window.addEventListener("pageshow", onPageShow);
    return () => window.removeEventListener("pageshow", onPageShow);
  }, [isHome]);

  const videoInner = (
    <VideoLoadGuard
      ref={videoRef}
      key={`home-hero-${heroVideoPlayUrl}-${effectiveHeroVideoVersion ?? 0}`}
      url={heroVideoPlayUrl}
      version={effectiveHeroVideoVersion}
      posterUrl={posterUrl}
      posterVersion={undefined}
      lazyAttach
      deferAttachUntilIdle
      idleAttachTimeoutMs={900}
      posterPriority
      optimizeGpu
      forcePoster={!shouldLoadHeroVideo}
      suspendSrc={prefersReducedMotion}
      snapVideoOpacity
      containerClassName="absolute inset-0 min-w-full min-h-full w-full h-full"
      className="absolute left-1/2 top-1/2 min-w-full min-h-full w-full h-full -translate-x-1/2 -translate-y-1/2 object-cover"
      style={{ pointerEvents: "none" }}
      autoPlay
      loop
      muted
      playsInline
      preload="none"
      disablePictureInPicture
      disableRemotePlayback
      onContextMenu={(e) => e.preventDefault()}
    />
  );

  const videoShellClass =
    "absolute left-1/2 top-1/2 h-[104%] w-[104%] min-h-[104%] min-w-[104%] -translate-x-1/2 -translate-y-1/2 origin-center scale-100 md:left-0 md:top-0 md:h-full md:w-full md:min-h-0 md:min-w-0 md:translate-x-0 md:translate-y-0 md:scale-100";

  /** Always show poster/placeholder at full opacity — splash overlay (z-9999) covers brand moment; fading the whole shell left semi-transparent gradients over nothing = black screen on mobile */
  const shellClassName = [videoShellClass, "opacity-100"].join(" ");

  return (
    <HomeHeroSectionsContext.Provider value={homeSectionsBridge}>
      <div
        aria-hidden="true"
        className="fixed inset-0 z-0 min-h-dvh pointer-events-none overflow-hidden motion-reduce:transition-none"
        style={{
          visibility: isHome ? "visible" : "hidden",
          opacity: isHome ? 1 : 0,
          transition: isHome ? "opacity 0.12s ease-out" : "opacity 0.1s ease-out",
        }}
      >
        {everHome ? (
          <div className="absolute inset-0 overflow-hidden">
            <div className={shellClassName} aria-hidden>
              {videoInner}
            </div>
          </div>
        ) : !isHome ? (
          <div className="absolute inset-0 bg-luxury-black" aria-hidden />
        ) : null}
        <div
          className="absolute inset-0 hidden md:block pointer-events-none"
          style={{
            backgroundImage:
              "linear-gradient(to bottom, rgba(0,0,0,0.55), rgba(0,0,0,0.25) 50%, rgba(0,0,0,0.6)), linear-gradient(to right, rgba(0,0,0,0.65), transparent 50%, rgba(0,0,0,0.4))",
          }}
          aria-hidden
        />
        <div
          className="absolute inset-0 md:hidden pointer-events-none"
          style={{
            backgroundImage:
              "linear-gradient(to bottom, rgba(0,0,0,0.38), rgba(0,0,0,0.12) 50%, rgba(0,0,0,0.45)), linear-gradient(to right, rgba(0,0,0,0.45), transparent 50%, rgba(0,0,0,0.28))",
          }}
          aria-hidden
        />
      </div>
      {isHome && splashComplete && (
        <HeroEditPortal
          page="home"
          section="hero"
          type="video"
          onUploadDone={refetch}
          editLabel="Edit video"
          performanceMode="home"
        />
      )}
    </HomeHeroSectionsContext.Provider>
  );
}
