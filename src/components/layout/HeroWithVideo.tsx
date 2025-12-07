"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { getR2UrlClient } from "@/utils/r2-url";
import { useReliableVideoAutoplay } from "@/hooks/useReliableVideoAutoplay";

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
  const [isVideoLoaded, setIsVideoLoaded] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    // Detect mobile
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);

    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Ensure video autoplays reliably - hook handles autoplay, we only track loaded state
  useReliableVideoAutoplay(videoRef);

  // Video loaded state tracking
  useEffect(() => {
    if (isMobile) return; // Skip video handling on mobile

    const video = videoRef.current;
    if (!video) return;

    const handleCanPlay = () => {
      setIsVideoLoaded(true);
    };

    const handleLoadedData = () => {
      setIsVideoLoaded(true);
    };

    const handleError = () => {
      setIsVideoLoaded(false);
      console.warn("[HeroWithVideo] Video error occurred");
    };

    // Check if video is already loaded
    if (video.readyState >= 2) {
      setIsVideoLoaded(true);
    }

    video.addEventListener("canplay", handleCanPlay);
    video.addEventListener("loadeddata", handleLoadedData);
    video.addEventListener("error", handleError);

    return () => {
      video.removeEventListener("canplay", handleCanPlay);
      video.removeEventListener("loadeddata", handleLoadedData);
      video.removeEventListener("error", handleError);
    };
  }, [isMobile]);

  // Determine which video source to use
  const currentVideoSrc = isMobile && mobileSrc ? mobileSrc : videoSrc;

  return (
    <section className="relative h-screen w-full overflow-hidden">
      {/* Background Video */}
      <div className="absolute inset-0 z-0">
        {!isMobile && ( // Only show video on desktop
          <video
            ref={videoRef}
            autoPlay
            loop
            muted
            playsInline
            preload="auto"
            disablePictureInPicture
            disableRemotePlayback
            className={`w-full h-full object-cover transition-opacity duration-1000 pointer-events-none select-none ${
              isVideoLoaded ? "opacity-100" : "opacity-0"
            }`}
            style={{
              pointerEvents: "none",
              outline: "none",
              WebkitTapHighlightColor: "transparent",
              WebkitTouchCallout: "none",
              userSelect: "none",
            }}
            onContextMenu={(e) => e.preventDefault()}
            onPlay={(e) => {
              const video = e.currentTarget;
              if (video.paused) {
                video.play().catch(() => {});
              }
            }}
          >
            <source src={currentVideoSrc} type="video/mp4" />
            Your browser does not support video.
          </video>
        )}

        {/* Fallback Image (shown on mobile or if video fails) */}
        {(isMobile || !isVideoLoaded) && (
          <div
            className="w-full h-full bg-cover bg-center"
            style={{ backgroundImage: `url(${r2FallbackImage})` }}
          />
        )}

        {/* Dark Overlay for better text readability */}
        <div
          className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-black/70"
          style={{ opacity: overlayOpacity }}
        />
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
          <h1 className="text-5xl md:text-7xl font-serif font-bold mb-6">
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

