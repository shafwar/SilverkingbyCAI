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
  useReliableVideoAutoplay(videoRef);

  // Video loaded state tracking with proper error handling
  useEffect(() => {
    if (isMobile) return; // Skip video handling on mobile

    const video = videoRef.current;
    if (!video) return;

    const handleCanPlay = () => {
      try {
        setIsVideoLoaded(true);
        setVideoError(false);
      } catch (error) {
        console.error("[HeroWithVideo] Error in handleCanPlay:", error);
      }
    };

    const handleLoadedData = () => {
      try {
        setIsVideoLoaded(true);
        setVideoError(false);
      } catch (error) {
        console.error("[HeroWithVideo] Error in handleLoadedData:", error);
      }
    };

    const handleError = (event: Event) => {
      try {
        setIsVideoLoaded(false);
        setVideoError(true);

        // Get detailed error information
        const videoElement = event.target as HTMLVideoElement;
        const error = videoElement.error;

        if (error) {
          let errorMessage = "[HeroWithVideo] Video error occurred";
          switch (error.code) {
            case error.MEDIA_ERR_ABORTED:
              errorMessage += ": Media loading aborted";
              break;
            case error.MEDIA_ERR_NETWORK:
              errorMessage += ": Network error while loading media";
              break;
            case error.MEDIA_ERR_DECODE:
              errorMessage += ": Media decoding error";
              break;
            case error.MEDIA_ERR_SRC_NOT_SUPPORTED:
              errorMessage += ": Media source not supported";
              break;
            default:
              errorMessage += `: Unknown error (code ${error.code})`;
          }
          console.warn(errorMessage, {
            code: error.code,
            message: error.message,
            videoSrc: currentVideoSrc,
          });
        } else {
          console.warn("[HeroWithVideo] Video error occurred (no error details available)", {
            videoSrc: currentVideoSrc,
          });
        }
      } catch (error) {
        console.error("[HeroWithVideo] Error in handleError:", error);
        // Ensure error state is set even if logging fails
        setVideoError(true);
        setIsVideoLoaded(false);
      }
    };

    // Check if video is already loaded
    try {
      if (video.readyState >= 2) {
        setIsVideoLoaded(true);
        setVideoError(false);
      }
    } catch (error) {
      console.error("[HeroWithVideo] Error checking video readyState:", error);
    }

    try {
      video.addEventListener("canplay", handleCanPlay);
      video.addEventListener("loadeddata", handleLoadedData);
      video.addEventListener("error", handleError);
    } catch (error) {
      console.error("[HeroWithVideo] Error adding event listeners:", error);
    }

    return () => {
      try {
        video.removeEventListener("canplay", handleCanPlay);
        video.removeEventListener("loadeddata", handleLoadedData);
        video.removeEventListener("error", handleError);
      } catch (error) {
        console.error("[HeroWithVideo] Error removing event listeners:", error);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isMobile]); // currentVideoSrc is computed from isMobile, videoSrc, mobileSrc

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
              try {
                const video = e.currentTarget;
                if (video.paused) {
                  video.play().catch((error) => {
                    console.warn("[HeroWithVideo] Error playing video:", error);
                    setVideoError(true);
                    setIsVideoLoaded(false);
                  });
                }
              } catch (error) {
                console.error("[HeroWithVideo] Error in onPlay handler:", error);
                setVideoError(true);
              }
            }}
          >
            <source src={currentVideoSrc} type="video/mp4" />
            Your browser does not support video.
          </video>
        )}

        {/* Fallback Image (shown on mobile or if video fails) */}
        {(isMobile || !isVideoLoaded || videoError) && (
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
