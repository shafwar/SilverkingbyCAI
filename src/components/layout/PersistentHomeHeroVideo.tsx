"use client";

import { usePathname } from "next/navigation";
import { useRef, useEffect, useLayoutEffect, useState } from "react";
import { motion, type Variants } from "framer-motion";
import { getR2UrlClient } from "@/utils/r2-url";
import { usePageSections } from "@/hooks/usePageSections";
import { usePageMedia } from "@/hooks/usePageMedia";
import { useReliableVideoAutoplay } from "@/hooks/useReliableVideoAutoplay";
import { VideoLoadGuard } from "@/components/section-media/SectionMediaLoadGuard";
import { HeroEditPortal } from "@/components/layout/HeroEditPortal";

const HERO_VIDEO_FALLBACK = "/videos/hero/hero-background.mp4";

/** Scale/opacity only — avoid filter blur over full-screen decode (keeps playback smooth) */
const persistentVideoIntroVariants: Variants = {
  hidden: { opacity: 0, scale: 1.08 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { duration: 1.35, ease: [0.16, 1, 0.3, 1] },
  },
};

const POST_SPLASH_BUFFER_MS = 3500;
const SUBSEQUENT_VISIT_BUFFER_MS = 3200;

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

/**
 * After first splash, `splash-complete` is set on body; repeat visits skip splash via sessionStorage.
 */
function useHomeHeroVideoReveal(): "instant" | "animating" | "revealed" {
  const [state, setState] = useState<"instant" | "animating" | "revealed">("animating");

  useLayoutEffect(() => {
    try {
      if (sessionStorage.getItem("splashShown") === "true") {
        setState("instant");
        return;
      }
    } catch {
      /* ignore */
    }

    if (typeof document !== "undefined" && document.body.classList.contains("splash-complete")) {
      setState("revealed");
      return;
    }

    const obs = new MutationObserver(() => {
      if (document.body.classList.contains("splash-complete")) {
        setState("revealed");
        obs.disconnect();
      }
    });
    obs.observe(document.body, { attributes: true, attributeFilter: ["class"] });
    return () => obs.disconnect();
  }, []);

  return state;
}

export function PersistentHomeHeroVideo() {
  const pathname = usePathname();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isHome, setIsHome] = useState(false);
  const [homeVideoCycle, setHomeVideoCycle] = useState(0);
  const wasHomeRef = useRef(false);
  const splashComplete = useSplashComplete();
  const prefersReducedMotion = usePrefersReducedMotion();
  const videoReveal = useHomeHeroVideoReveal();
  const { sections, refetch } = usePageSections("home");
  const { data: pageMedia } = usePageMedia("home");

  const heroUrl = sections.hero?.url ?? getR2UrlClient(HERO_VIDEO_FALLBACK);
  const heroVersion = sections.hero?.version;

  const posterUrl =
    pageMedia?.heroImageUrl && pageMedia.heroImageUrl.length > 0
      ? pageMedia.heroImageUrl
      : null;

  useReliableVideoAutoplay(videoRef, {
    mode: "background",
    reattachKey: homeVideoCycle,
  });

  useEffect(() => {
    const home = isHomePath(pathname);
    if (home) {
      if (!wasHomeRef.current) {
        setHomeVideoCycle((n) => n + 1);
      }
      wasHomeRef.current = true;
    } else {
      wasHomeRef.current = false;
    }
    setIsHome(home);
  }, [pathname]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (!isHome) video.pause();
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
  }, [isHome, homeVideoCycle]);

  /** Logo → home SPA: new <video> node; kick play after layout (pairs with reattachKey) */
  useLayoutEffect(() => {
    if (!isHome) return;
    const v = videoRef.current;
    if (!v) return;
    const kick = () => void v.play().catch(() => {});
    kick();
    const r = requestAnimationFrame(kick);
    const t = window.setTimeout(kick, 160);
    return () => {
      cancelAnimationFrame(r);
      window.clearTimeout(t);
    };
  }, [isHome, homeVideoCycle]);

  const videoMountKey = `home-hero-${homeVideoCycle}`;

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
      {isHome ? (
        <div className="absolute inset-0 overflow-hidden">
          {videoReveal === "instant" || prefersReducedMotion ? (
            <div
              className="absolute left-1/2 top-1/2 h-[104%] w-[104%] min-h-[104%] min-w-[104%] -translate-x-1/2 -translate-y-1/2 origin-center scale-100 md:left-0 md:top-0 md:h-full md:w-full md:min-h-0 md:min-w-0 md:translate-x-0 md:translate-y-0 md:scale-100"
              aria-hidden
            >
              <VideoLoadGuard
                key={videoMountKey}
                ref={videoRef}
                url={heroUrl}
                version={heroVersion}
                posterUrl={posterUrl}
                posterVersion={undefined}
                lazyAttach={false}
                deferAttachUntilIdle
                idleAttachTimeoutMs={560}
                optimizeGpu
                forcePoster={false}
                suspendSrc={prefersReducedMotion}
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
            </div>
          ) : (
            <motion.div
              className="absolute left-1/2 top-1/2 h-[104%] w-[104%] min-h-[104%] min-w-[104%] -translate-x-1/2 -translate-y-1/2 origin-center scale-100 md:left-0 md:top-0 md:h-full md:w-full md:min-h-0 md:min-w-0 md:translate-x-0 md:translate-y-0 md:scale-100"
              variants={persistentVideoIntroVariants}
              initial="hidden"
              animate={videoReveal === "revealed" ? "visible" : "hidden"}
              aria-hidden
            >
              <VideoLoadGuard
                key={videoMountKey}
                ref={videoRef}
                url={heroUrl}
                version={heroVersion}
                posterUrl={posterUrl}
                posterVersion={undefined}
                lazyAttach={false}
                deferAttachUntilIdle
                idleAttachTimeoutMs={560}
                optimizeGpu
                forcePoster={false}
                suspendSrc={prefersReducedMotion}
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
            </motion.div>
          )}
        </div>
      ) : (
        <div className="absolute inset-0 bg-luxury-black" aria-hidden />
      )}
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
