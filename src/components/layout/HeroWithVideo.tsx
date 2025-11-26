"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { getR2UrlClient } from "@/utils/r2-url";

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

  // Optimal video autoplay handling - ensure video never pauses or breaks
  useEffect(() => {
    if (isMobile) return; // Skip video handling on mobile

    const video = videoRef.current;
    if (!video) return;

    // Force play function with error handling and retry mechanism
    const forcePlay = async () => {
      try {
        if (video.paused && !video.ended) {
          await video.play();
        }
      } catch (error) {
        console.warn("[HeroWithVideo] Video autoplay prevented, retrying:", error);
        // Retry after a short delay with exponential backoff
        setTimeout(() => {
          video.play().catch(() => {
            // Second retry after longer delay
            setTimeout(() => {
              video.play().catch(() => {
                console.warn("[HeroWithVideo] Video autoplay failed after multiple retries");
              });
            }, 500);
          });
        }, 100);
      }
    };

    // Handle video ready states
    const handleCanPlay = () => {
      setIsVideoLoaded(true);
      forcePlay();
    };

    const handleLoadedData = () => {
      setIsVideoLoaded(true);
      forcePlay();
    };

    // Handle video errors
    const handleError = () => {
      setIsVideoLoaded(false);
      console.warn("[HeroWithVideo] Video error occurred");
    };

    // Resume video if it pauses (prevent breaks)
    const handlePause = () => {
      if (!video.ended) {
        // Small delay to avoid infinite loop
        setTimeout(() => {
          if (video.paused && !video.ended) {
            forcePlay();
          }
        }, 50);
      }
    };

    // Handle visibility change - resume video when page becomes visible
    const handleVisibilityChange = () => {
      if (!document.hidden && video.paused && !video.ended) {
        forcePlay();
      }
    };

    // Handle video end - restart immediately for seamless loop
    const handleEnded = () => {
      video.currentTime = 0;
      forcePlay();
    };

    // Handle video waiting/buffering - resume when ready
    const handleWaiting = () => {
      // Video is buffering, will resume automatically when ready
      // But we can also try to play if it's paused
      if (video.paused && !video.ended) {
        setTimeout(() => {
          forcePlay();
        }, 100);
      }
    };

    // Check if video is already loaded
    if (video.readyState >= 2) {
      setIsVideoLoaded(true);
    }

    // Initial play attempt
    forcePlay();

    // Event listeners
    video.addEventListener("canplay", handleCanPlay);
    video.addEventListener("loadeddata", handleLoadedData);
    video.addEventListener("error", handleError);
    video.addEventListener("pause", handlePause);
    video.addEventListener("ended", handleEnded);
    video.addEventListener("waiting", handleWaiting);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    // Force load video to ensure it starts loading immediately
    video.load();

    // Periodic check to ensure video is playing (fallback mechanism)
    const playCheckInterval = setInterval(() => {
      if (video.paused && !video.ended && !document.hidden) {
        forcePlay();
      }
    }, 2000); // Check every 2 seconds

    // Cleanup
    return () => {
      video.removeEventListener("canplay", handleCanPlay);
      video.removeEventListener("loadeddata", handleLoadedData);
      video.removeEventListener("error", handleError);
      video.removeEventListener("pause", handlePause);
      video.removeEventListener("ended", handleEnded);
      video.removeEventListener("waiting", handleWaiting);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      clearInterval(playCheckInterval);
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
            className={`w-full h-full object-cover transition-opacity duration-1000 ${
              isVideoLoaded ? "opacity-100" : "opacity-0"
            }`}
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

