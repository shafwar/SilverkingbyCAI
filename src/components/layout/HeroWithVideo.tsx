"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { getR2UrlClient } from "@/utils/r2-url";
import { useReliableVideoAutoplay } from "@/hooks/useReliableVideoAutoplay";
import { useShouldLoadHeroVideo } from "@/hooks/useShouldLoadHeroVideo";
import { VideoLoadGuard } from "@/components/section-media/SectionMediaLoadGuard";

interface HeroWithVideoProps {
  videoSrc: string;
  mobileSrc?: string; // Optional mobile version
  fallbackImage?: string;
  title: string;
  subtitle?: string;
  overlayOpacity?: number; // 0-1, default 0.5
  children?: React.ReactNode;
}

export default function HeroWithVideo({
  videoSrc,
  mobileSrc,
  fallbackImage = "/images/hero-fallback.jpg",
  title,
  subtitle,
  overlayOpacity = 0.5,
  children,
}: HeroWithVideoProps) {
  // Convert fallback image to R2 URL
  const r2FallbackImage = getR2UrlClient(fallbackImage);
  const videoRef = useRef<HTMLVideoElement>(null);
  const shouldLoadVideo = useShouldLoadHeroVideo();
  const [videoError, setVideoError] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    // Detect mobile with error handling
    const checkMobile = () => {
      try {
        setIsMobile(window.innerWidth < 768);
      } catch (error) {
        console.error("[HeroWithVideo] Error detecting mobile:", error);
        // Fallback to desktop view
        setIsMobile(false);
      }
    };

    try {
      checkMobile();
      window.addEventListener("resize", checkMobile);
    } catch (error) {
      console.error("[HeroWithVideo] Error setting up mobile detection:", error);
    }

    return () => {
      try {
        window.removeEventListener("resize", checkMobile);
      } catch (error) {
        console.error("[HeroWithVideo] Error cleaning up mobile detection:", error);
      }
    };
  }, []);

  // Ensure video autoplays reliably - hook handles autoplay, we only track loaded state
  useReliableVideoAutoplay(videoRef, { mode: "background" });

  // Determine which video source to use with error handling
  const currentVideoSrc = (() => {
    try {
      return isMobile && mobileSrc ? mobileSrc : videoSrc;
    } catch (error) {
      console.error("[HeroWithVideo] Error determining video source:", error);
      return videoSrc; // Fallback to default video source
    }
  })();

  return (
    <section className="relative h-screen w-full overflow-hidden">
      {/* Background Video — skip on mobile or slow connection to keep page light */}
      <div className="absolute inset-0 z-0">
        {!isMobile && shouldLoadVideo && !videoError ? (
          <VideoLoadGuard
            ref={videoRef}
            url={currentVideoSrc}
            posterUrl={r2FallbackImage}
            posterPriority
            optimizeGpu
            lightVideoFade
            containerClassName="absolute inset-0 h-full w-full"
            className="h-full w-full object-cover pointer-events-none select-none"
            style={{
              pointerEvents: "none",
              outline: "none",
              WebkitTapHighlightColor: "transparent",
              WebkitTouchCallout: "none",
              userSelect: "none",
            }}
            autoPlay
            loop
            muted
            playsInline
            preload="auto"
            disablePictureInPicture
            disableRemotePlayback
            onContextMenu={(e) => e.preventDefault()}
            onError={() => setVideoError(true)}
            onPlay={(e) => {
              try {
                const video = e.currentTarget;
                if (video.paused) {
                  video.play().catch(() => setVideoError(true));
                }
              } catch {
                setVideoError(true);
              }
            }}
          />
        ) : null}

        {/* Fallback Image (shown on mobile, slow connection, or if video fails) */}
        {(isMobile || !shouldLoadVideo || videoError) && (
          <div
            className="w-full h-full bg-cover bg-center"
            style={{ backgroundImage: `url(${r2FallbackImage})` }}
          />
        )}

      </div>

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center justify-center h-full px-4 text-center">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.3 }}
          className="max-w-5xl"
        >
          {/* Title */}
          <h1 className="text-5xl md:text-7xl font-sans font-bold mb-6">
            <span className="bg-gradient-to-r from-luxury-gold via-luxury-lightGold to-luxury-gold bg-clip-text text-transparent">
              {title}
            </span>
          </h1>

          {/* Subtitle */}
          {subtitle && (
            <p className="text-xl md:text-3xl text-luxury-lightSilver mb-8 font-light">
              {subtitle}
            </p>
          )}

          {/* Custom Children Content */}
          {children}
        </motion.div>

        {/* Scroll Indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 1.5 }}
          className="absolute bottom-10 left-1/2 transform -translate-x-1/2"
        >
          <div className="w-6 h-10 border-2 border-luxury-gold rounded-full flex justify-center pt-2">
            <motion.div
              animate={{ y: [0, 12, 0] }}
              transition={{ duration: 1.5, repeat: Infinity }}
              className="w-1.5 h-1.5 bg-luxury-gold rounded-full"
            />
          </div>
        </motion.div>
      </div>
    </section>
  );
}
