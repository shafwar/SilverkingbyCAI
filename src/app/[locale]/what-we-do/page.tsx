"use client";

import { useRef, useMemo, useState, useEffect, useLayoutEffect, forwardRef } from "react";
import { useTranslations, useLocale } from "next-intl";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { motion, useInView, AnimatePresence, type Variants } from "framer-motion";
import { getR2UrlClient } from "@/utils/r2-url";
import {
  Sparkles,
  FlaskConical,
  Shield,
  ArrowRight,
  Instagram,
  Twitter,
  Linkedin,
  Youtube,
} from "lucide-react";
import Navbar from "@/components/layout/Navbar";
import Link from "next/link";
import Image from "next/image";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

const revealVariants: Variants = {
  initial: { opacity: 0, y: 40 },
  animate: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1], staggerChildren: 0.15 },
  },
};

const presenceVariants: Variants = {
  initial: { opacity: 0, y: 32, scale: 0.96, filter: "blur(8px)" },
  animate: (index = 0) => ({
    opacity: 1,
    y: 0,
    scale: 1,
    filter: "blur(0px)",
    transition: {
      duration: 0.6,
      ease: [0.22, 1, 0.36, 1],
      delay: Number(index) * 0.08,
    },
  }),
};

const glassPanelVariants: Variants = {
  initial: { opacity: 0, scale: 0.94, y: 28, filter: "blur(10px)" },
  animate: (index = 0) => ({
    opacity: 1,
    scale: 1,
    y: 0,
    filter: "blur(0px)",
    transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1], delay: Number(index) * 0.08 },
  }),
};

const hoverSpring = {
  scale: 1.02,
  transition: {
    type: "spring" as const,
    stiffness: 220,
    damping: 18,
  },
} as const;

const FeatureCard = ({
  feature,
  index,
}: {
  feature: { title: string; description: string; icon: typeof Sparkles; gradient: string };
  index: number;
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const isInView = useInView(containerRef, { amount: 0.45, margin: "-15% 0px" });

  return (
    <div
      ref={containerRef}
      className="group relative min-h-[280px] sm:min-h-[320px] md:min-h-[360px]"
    >
      <AnimatePresence mode="sync">
        {isInView && (
          <motion.div
            key={`${feature.title}-card`}
            variants={glassPanelVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            custom={index}
            whileHover={hoverSpring}
            className="relative flex h-full flex-col rounded-2xl sm:rounded-3xl border border-white/10 bg-gradient-to-br from-white/5 to-white/[0.02] p-6 sm:p-8 md:p-10 backdrop-blur-xl transition-all duration-500 hover:border-luxury-gold/40 hover:shadow-[0px_30px_80px_-40px_rgba(212,175,55,0.6)]"
          >
            <div
              className="absolute -inset-px rounded-3xl bg-gradient-to-br opacity-0 blur-2xl transition-opacity duration-500 group-hover:opacity-20"
              style={{ background: `linear-gradient(to bottom right, var(--tw-gradient-stops))` }}
            />

            <div className="relative z-10">
              <div
                className={`mb-4 sm:mb-5 md:mb-6 inline-flex rounded-xl sm:rounded-2xl bg-gradient-to-br ${feature.gradient} p-3 sm:p-3.5 md:p-4 shadow-lg`}
              >
                <feature.icon className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
              </div>
              <h3 className="mb-2 sm:mb-3 text-xl sm:text-2xl font-semibold text-white">
                {feature.title}
              </h3>
              <p className="text-sm sm:text-base text-luxury-silver/80 leading-relaxed">
                {feature.description}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// Narrative Section with Dynamic Images & Mobile Swipe
const NarrativeImageSection = forwardRef<
  HTMLDivElement,
  {
    columns: ReadonlyArray<{ readonly title: string; readonly description: string }>;
    cards: ReadonlyArray<{
      readonly label: string;
      readonly caption: string;
      readonly images: readonly string[];
    }>;
    title?: string;
    description?: string;
  }
>(({ columns, cards, title, description }, ref) => {
  const [imageLoaded, setImageLoaded] = useState<{ [key: string]: boolean }>({});
  const [imageError, setImageError] = useState<{ [key: string]: boolean }>({});

  // Detect mobile for quality optimization
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // AGGRESSIVE preload strategy - preload ALL 3 main images IMMEDIATELY (useLayoutEffect for instant)
  useLayoutEffect(() => {
    // Preload all 3 first images with HIGHEST priority - they're all critical
    cards.forEach((card, idx) => {
      if (card.images[0]) {
        const imageUrl = card.images[0];

        // Use link preload with fetchpriority="high" for ALL 3 critical images
        const link = document.createElement("link");
        link.rel = "preload";
        link.as = "image";
        link.href = imageUrl;
        link.setAttribute("fetchpriority", "high");
        link.setAttribute("as", "image");
        document.head.appendChild(link);

        // INSTANT preload with Image object for immediate decode and rendering
        const img = new window.Image();
        img.src = imageUrl;
        img.loading = "eager";
        img.decoding = "async";
        // Only set crossOrigin if it's a remote URL
        if (imageUrl.startsWith("http") && !imageUrl.includes("localhost")) {
          img.crossOrigin = "anonymous";
        }

        // Decode ALL 3 first images IMMEDIATELY - they're all above the fold and critical
        const preloadImage = () => {
          img
            .decode()
            .then(() => {
              // Image decoded successfully, mark as loaded IMMEDIATELY
              setImageLoaded((prev) => ({
                ...prev,
                [`${idx}-0`]: true,
              }));
            })
            .catch(() => {
              // Silent fail - will be handled by Image component
            });
        };

        // Decode ALL 3 images immediately - no delay for critical images
        if (idx < 3) {
          // All 3 main images: decode IMMEDIATELY
          preloadImage();
        } else if (typeof window !== "undefined" && window.requestIdleCallback) {
          // Other images: decode when browser is idle
          window.requestIdleCallback(preloadImage, { timeout: 500 });
        } else {
          // Fallback for browsers without requestIdleCallback
          setTimeout(preloadImage, 100 * idx);
        }
      }
    });

    return () => {
      // Cleanup preload links
      document.querySelectorAll('link[rel="preload"][as="image"]').forEach((link) => {
        if (link.getAttribute("href")?.includes("/images/")) {
          link.remove();
        }
      });
    };
  }, [cards, isMobile]);

  // Simplified timeout - only set for images that haven't loaded after 5 seconds
  useEffect(() => {
    const timeouts: NodeJS.Timeout[] = [];

    cards.forEach((_, idx) => {
      const imageKey = `${idx}-0`;
      // Only set timeout if image hasn't loaded yet
      if (!imageLoaded[imageKey] && !imageError[imageKey]) {
        const timeout = setTimeout(() => {
          setImageError((prev) => {
            // Double check to avoid race conditions
            if (!prev[imageKey]) {
              return {
                ...prev,
                [imageKey]: true,
              };
            }
            return prev;
          });
        }, 5000);
        timeouts.push(timeout);
      }
    });

    return () => {
      timeouts.forEach((timeout) => clearTimeout(timeout));
    };
  }, [cards, imageLoaded, imageError]); // Include all dependencies

  return (
    <section
      ref={ref}
      className="relative border-t border-white/5 bg-[#000] px-4 sm:px-6 md:px-8 lg:px-12 py-16 sm:py-20 md:py-24 lg:py-32 overflow-visible isolate"
    >
      <div className="relative z-10 mx-auto max-w-[1320px]">
        {/* Text section at top - Pixelmatters style */}
        <div className="mb-12 md:mb-16 lg:mb-20">
          <div className="space-y-4 md:space-y-5 max-w-3xl">
            <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-semibold leading-tight text-white">
              {title || columns[0]?.title || "Craft from raw bullion"}
            </h2>
            <p className="text-base sm:text-lg md:text-xl leading-relaxed text-neutral-300 max-w-2xl">
              {description ||
                columns[0]?.description ||
                "We transform responsibly sourced gold, silver, and palladium into investment-grade bars using tightly controlled refining and casting lines."}
            </p>
          </div>
        </div>

        {/* Enhanced Cards - Pixelmatters style - aligned properly */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 lg:gap-8 pb-6 md:pb-0">
          {cards.map((card, idx) => {
            const currentImage = card.images[0];
            const imageKey = `${idx}-0`;
            const isImageLoaded = imageLoaded[imageKey];
            const hasImageError = imageError[imageKey];

            return (
              <div
                key={card.label}
                className="relative w-full opacity-0 animate-fade-in"
                style={{
                  animationDelay: `${idx * 100}ms`,
                  animationFillMode: "forwards",
                }}
              >
                {/* Enhanced Card - Pixelmatters style */}
                <div
                  className="relative w-full overflow-hidden rounded-2xl bg-black/40 border border-white/5 shadow-lg md:shadow-xl transition-all duration-300 flex flex-col"
                  style={{
                    aspectRatio: "4/3",
                    minHeight: "280px",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = "scale(1.02)";
                    e.currentTarget.style.boxShadow = "0 25px 50px -12px rgba(0, 0, 0, 0.5)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = "scale(1)";
                    e.currentTarget.style.boxShadow = "";
                  }}
                >
                  {/* Image container - large image at top */}
                  <div className="relative w-full flex-[0_0_65%] overflow-hidden bg-black/40">
                    {/* Loading placeholder */}
                    {!isImageLoaded && !hasImageError && (
                      <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-black/60 to-black/40 z-10">
                        <div className="h-6 w-6 sm:h-8 sm:w-8 animate-spin rounded-full border-2 border-white/20 border-t-white/60" />
                      </div>
                    )}

                    {/* Image */}
                    {!hasImageError && (
                      <div
                        className={`absolute inset-0 transition-opacity duration-300 ease-out ${
                          isImageLoaded ? "opacity-100" : "opacity-0"
                        }`}
                        style={{
                          willChange: isImageLoaded ? "auto" : "opacity",
                        }}
                      >
                        <Image
                          src={currentImage}
                          alt={card.label}
                          fill
                          className="object-cover"
                          sizes="(max-width: 768px) 100vw, (max-width: 1280px) 33vw, 440px"
                          priority={idx < 3}
                          loading={idx < 3 ? "eager" : "lazy"}
                          quality={isMobile ? 75 : 92}
                          unoptimized={false}
                          fetchPriority={idx < 3 ? "high" : "auto"}
                          placeholder="blur"
                          blurDataURL="data:image/svg+xml,%3Csvg width='16' height='12' xmlns='http://www.w3.org/2000/svg'%3E%3ClinearGradient id='g'%3E%3Cstop stop-color='%23090'/%3E%3Cstop offset='1' stop-color='%23000'/%3E%3C/linearGradient%3E%3Crect width='16' height='12' fill='url(%23g)'/%3E%3C/svg%3E"
                          onLoad={() => {
                            // Mark as loaded immediately
                            setImageLoaded((prev) => ({
                              ...prev,
                              [imageKey]: true,
                            }));
                          }}
                          onError={() => {
                            setImageError((prev) => ({
                              ...prev,
                              [imageKey]: true,
                            }));
                          }}
                        />
                      </div>
                    )}

                    {/* Error fallback */}
                    {hasImageError && (
                      <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-black/80 to-black/60 z-10">
                        {/* Minimalist Gold SVG fallback icon instead of text fallback */}
                        <svg
                          width="46"
                          height="32"
                          viewBox="0 0 46 32"
                          fill="none"
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <rect width="46" height="32" rx="8" fill="url(#gold)" />
                          <defs>
                            <linearGradient
                              id="gold"
                              x1="0"
                              y1="0"
                              x2="46"
                              y2="32"
                              gradientUnits="userSpaceOnUse"
                            >
                              <stop stop-color="#B8960E" />
                              <stop offset="1" stop-color="#FFD700" />
                            </linearGradient>
                          </defs>
                        </svg>
                      </div>
                    )}
                  </div>

                  {/* Content section - Logo and text below image */}
                  <div className="relative flex-[0_0_35%] bg-black/60 p-4 md:p-5 flex flex-col justify-start min-h-0">
                    {/* Logo/Client name - small text */}
                    <div className="mb-2 flex-shrink-0">
                      <p className="text-[10px] md:text-xs font-medium text-white/60 uppercase tracking-wider">
                        {card.label}
                      </p>
                    </div>

                    {/* Description text - small and clean */}
                    <p className="text-xs md:text-sm leading-relaxed text-neutral-300 line-clamp-2">
                      {card.caption}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
});

NarrativeImageSection.displayName = "NarrativeImageSection";

// End of file helpers

export default function WhatWeDoPage() {
  const t = useTranslations("whatWeDo");
  const tNav = useTranslations("nav");
  const locale = useLocale();
  const pageRef = useRef<HTMLDivElement | null>(null);
  const heroRef = useRef<HTMLDivElement | null>(null);
  const noiseOverlay = useRef<HTMLDivElement | null>(null);
  const gradientOverlay = useRef<HTMLDivElement | null>(null);
  const sectionsRef = useRef<(HTMLDivElement | null)[]>([]);

  const featureItems = useMemo(
    () => [
      {
        title: t("capabilities.features.fabrication.title"),
        description: t("capabilities.features.fabrication.description"),
        icon: Sparkles,
        gradient: "from-luxury-gold to-luxury-lightGold",
      },
      {
        title: t("capabilities.features.purityLab.title"),
        description: t("capabilities.features.purityLab.description"),
        icon: FlaskConical,
        gradient: "from-luxury-silver to-white",
      },
      {
        title: t("capabilities.features.security.title"),
        description: t("capabilities.features.security.description"),
        icon: Shield,
        gradient: "from-luxury-gold to-luxury-lightGold",
      },
    ],
    [t]
  );

  const premiumGradient = useMemo(
    () =>
      "linear-gradient(160deg, rgba(18,18,18,0.94) 0%, rgba(10,10,10,0.98) 55%, rgba(6,6,6,1) 100%)",
    []
  );

  const narrativeColumns = [
    {
      title: t("title"),
      description: t("description"),
    },
    {
      title: t("card2.title"),
      description: t("card2.description"),
    },
    {
      title: t("card3.title"),
      description: t("card3.description"),
    },
  ] as const;

  const narrativeCards = [
    {
      label: t("card1.label"),
      caption: t("card1.caption"),
      images: [
        getR2UrlClient("/images/pexels-3d-render-1058120333-33539240.jpg"),
        getR2UrlClient("/images/pexels-sejio402-29336321.jpg"),
        getR2UrlClient("/images/silverking-gold.jpeg"),
      ],
    },
    {
      label: t("card2.label"),
      caption: t("card2.caption"),
      images: [
        getR2UrlClient("/images/pexels-michael-steinberg-95604-386318.jpg"),
        getR2UrlClient("/images/pexels-sejio402-29336326.jpg"),
        getR2UrlClient("/images/silverking-gold.jpeg"),
      ],
    },
    {
      label: t("card3.label"),
      caption: t("card3.caption"),
      images: [
        getR2UrlClient("/images/pexels-sejio402-29336327.jpg"),
        getR2UrlClient("/images/pexels-sejio402-29336321.jpg"),
        getR2UrlClient("/images/silverking-gold.jpeg"),
      ],
    },
  ] as const;

  useGSAP(
    () => {
      if (!pageRef.current) return;

      const ctx = gsap.context(() => {
        // Only apply GSAP to elements with data-reveal (exclude Framer Motion elements)
        gsap.set("[data-reveal]", { autoAlpha: 0, y: 40 });

        sectionsRef.current.forEach((section) => {
          if (!section) return;
          const targets = section.querySelectorAll("[data-reveal]");

          // Skip if no targets found
          if (targets.length === 0) return;

          ScrollTrigger.batch(targets, {
            start: "top 80%",
            onEnter: (batch) =>
              gsap.to(batch, {
                autoAlpha: 1,
                y: 0,
                duration: 0.6,
                stagger: 0.12,
                ease: "power3.out",
              }),
            once: true,
          });
        });

        if (heroRef.current) {
          const heroTimeline = gsap.timeline({ defaults: { ease: "power3.out" } });
          heroTimeline.fromTo(
            heroRef.current.querySelectorAll("[data-hero]") || [],
            { autoAlpha: 0, y: 40 },
            { autoAlpha: 1, y: 0, duration: 0.8, stagger: 0.15 }
          );
        }
      }, pageRef);

      return () => ctx.revert();
    },
    { scope: pageRef }
  );

  return (
    <div
      ref={pageRef}
      className="min-h-screen bg-luxury-black text-white selection:bg-luxury-gold/20 selection:text-white"
      style={{ backgroundImage: premiumGradient }}
    >
      {/* Global Background Noise & Gradient - properly contained */}
      <div
        ref={noiseOverlay}
        className="pointer-events-none fixed inset-0 z-0 opacity-60 mix-blend-soft-light overflow-hidden"
      />
      <div
        ref={gradientOverlay}
        className="pointer-events-none fixed inset-0 z-0 opacity-90 overflow-hidden"
        style={{
          background:
            "linear-gradient(180deg, rgba(18,18,18,0.7) 0%, rgba(10,10,10,0.85) 45%, rgba(4,4,4,0.95) 100%)",
        }}
      />

      {/* Shared Navbar */}
      <Navbar />

      {/* Hero Background – metal crafting hands video, matching products hero style */}
      {/* ENHANCED: Better container for proportional video */}
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden isolate">
        <div className="absolute inset-0 overflow-hidden">
          {/* Fallback dark gradient */}
          <div className="absolute inset-0 bg-gradient-to-br from-luxury-black via-luxury-black/95 to-luxury-black z-0" />

          <video
            ref={(video) => {
              if (video) {
                // Optimal video autoplay handling - ensure video never pauses or breaks
                const forcePlay = async () => {
                  try {
                    if (video.paused && !video.ended) {
                      await video.play();
                    }
                  } catch (error) {
                    console.warn("[WhatWeDoPage] Video autoplay prevented, retrying:", error);
                    // Retry after a short delay with exponential backoff
                    setTimeout(() => {
                      video.play().catch(() => {
                        // Second retry after longer delay
                        setTimeout(() => {
                          video.play().catch(() => {
                            console.warn(
                              "[WhatWeDoPage] Video autoplay failed after multiple retries"
                            );
                          });
                        }, 500);
                      });
                    }, 100);
                  }
                };

                // Handle video ready states
                const handleCanPlay = () => {
                  forcePlay();
                };

                const handleLoadedData = () => {
                  forcePlay();
                };

                // Handle video errors
                const handleError = () => {
                  console.warn("[WhatWeDoPage] Video error occurred");
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

                // Cleanup stored on video element
                (video as any).__cleanup = () => {
                  video.removeEventListener("canplay", handleCanPlay);
                  video.removeEventListener("loadeddata", handleLoadedData);
                  video.removeEventListener("error", handleError);
                  video.removeEventListener("pause", handlePause);
                  video.removeEventListener("ended", handleEnded);
                  video.removeEventListener("waiting", handleWaiting);
                  document.removeEventListener("visibilitychange", handleVisibilityChange);
                  clearInterval(playCheckInterval);
                };
              }
            }}
            autoPlay
            loop
            muted
            playsInline
            preload="auto"
            className="absolute inset-0 w-full h-full transition-opacity duration-1000 will-change-transform z-10"
            style={{
              // ENHANCED: Better proportional scaling - NO zoom, proper fit
              objectFit: "cover",
              objectPosition: "center center",
              // Ensure video fills container properly without distortion or zoom
              width: "100%",
              height: "100%",
              // NO min/max constraints that cause zoom - let it fit naturally
              transform: "scale(1)", // Explicitly set scale to 1 (no zoom)
              transformOrigin: "center center",
            }}
            disablePictureInPicture
            disableRemotePlayback
          >
            <source
              src={getR2UrlClient("/videos/hero/metal crafting hands.mp4")}
              type="video/mp4"
            />
          </video>

          {/* ENHANCED: Dark overlays for better readability - properly contained */}
          <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/50 to-black/70 z-20" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,rgba(10,10,10,0.7)_100%)] z-20" />
          {/* Enhanced bottom fade for better text readability */}
          <div className="absolute inset-x-0 bottom-0 left-0 right-0 h-48 sm:h-56 md:h-64 lg:h-72 bg-gradient-to-t from-luxury-black via-luxury-black/70 to-transparent pointer-events-none z-20" />
        </div>
      </div>

      {/* ENHANCED: Hero Section – typography & layout with better proportions - Mobile optimized */}
      <section
        ref={(element) => {
          sectionsRef.current[0] = element as HTMLDivElement | null;
        }}
        className="relative px-4 sm:px-6 md:px-8 lg:px-12 pt-[calc(env(safe-area-inset-top)+4rem)] sm:pt-32 md:pt-40 lg:pt-48 pb-16 sm:pb-24 md:pb-32 lg:pb-40 min-h-[85vh] sm:min-h-[80vh] md:min-h-[90vh] lg:min-h-screen flex items-center"
      >
        <div className="relative z-10 w-full max-w-[1400px] mx-auto">
          <motion.div
            ref={heroRef}
            variants={revealVariants}
            initial="initial"
            animate="animate"
            className="text-left max-w-4xl"
          >
            <motion.h1
              className="text-[1.75rem] sm:text-[2rem] md:text-[3.5rem] lg:text-[2.5rem] xl:text-[3.5rem] 2xl:text-[4rem] font-sans font-light leading-tight sm:leading-[1.15] tracking-tight md:tracking-[-0.02em] lg:tracking-[-0.03em] text-white"
              data-hero
            >
              {t("hero.title")}
              <br />
              <span className="font-sans font-normal">{t("hero.titleBold")}</span>
            </motion.h1>
            <motion.p
              data-hero
              className="mt-4 sm:mt-6 max-w-xl text-sm sm:text-[0.9375rem] md:text-base font-sans font-light leading-relaxed text-luxury-silver/80"
            >
              {t("hero.subtitle")}
            </motion.p>
          </motion.div>
        </div>
      </section>

      {/* Narrative + Image Grid – Pixelmatters-style with dynamic images */}
      <NarrativeImageSection
        ref={(element: HTMLDivElement | null) => {
          sectionsRef.current[1] = element;
        }}
        columns={narrativeColumns}
        cards={narrativeCards}
        title={t("title")}
        description={t("description")}
      />

      {/* Impact Section – similar to Pixelmatters "The impact you can expect" - Mobile optimized */}
      <section
        ref={(element) => {
          sectionsRef.current[2] = element as HTMLDivElement | null;
        }}
        className="relative border-t border-white/10 bg-gradient-to-b from-[#050505] via-[#050505] to-[#020202] px-4 sm:px-6 md:px-6 py-12 sm:py-16 md:py-24 lg:py-28 overflow-hidden isolate"
      >
        <div className="relative mx-auto flex max-w-[1320px] flex-col gap-10 sm:gap-12 md:gap-16 md:flex-row md:items-start md:justify-between">
          {/* Left title block */}
          <div className="max-w-md" data-reveal>
            <h2 className="text-2xl sm:text-3xl md:text-5xl lg:text-[52px] font-light leading-tight tracking-tight text-white">
              {t("impact.title")}
              <br />
              {t("impact.titleLine2")}
            </h2>
          </div>

          {/* Right list of impacts - Mobile optimized */}
          <div className="flex-1 space-y-8 sm:space-y-10 md:space-y-6" data-reveal>
            {[
              {
                title: t("impact.items.traceable.title"),
                body: t("impact.items.traceable.body"),
              },
              {
                title: t("impact.items.operational.title"),
                body: t("impact.items.operational.body"),
              },
              {
                title: t("impact.items.customer.title"),
                body: t("impact.items.customer.body"),
              },
              {
                title: t("impact.items.compliance.title"),
                body: t("impact.items.compliance.body"),
              },
            ].map((item, idx, arr) => (
              <div key={item.title}>
                <div className="grid gap-3 sm:gap-4 md:grid-cols-[minmax(0,0.5fr)_minmax(0,1fr)] md:gap-8">
                  <p className="text-sm sm:text-[0.9375rem] font-semibold text-white md:text-base">
                    {item.title}
                  </p>
                  <p className="text-sm sm:text-[0.9375rem] leading-relaxed text-luxury-silver/80 md:text-[15px]">
                    {item.body}
                  </p>
                </div>
                {idx < arr.length - 1 && (
                  <div className="mt-5 sm:mt-6 h-px w-full bg-gradient-to-r from-white/15 via-white/5 to-transparent" />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Centered CTA pill - Mobile optimized */}
        <div className="mt-12 sm:mt-14 md:mt-16 flex justify-center" data-reveal>
          <button
            type="button"
            className="group inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/[0.04] px-6 py-2 text-xs font-medium text-white backdrop-blur-md transition-all duration-300 hover:border-white/60 hover:bg-white/[0.08]"
          >
            <span>{t("capabilities.exploreButton")}</span>
            <span className="text-lg leading-none group-hover:translate-y-[1px] transition-transform">
              ↓
            </span>
          </button>
        </div>
      </section>

      {/* Features Section – Our Capabilities - Mobile optimized */}
      <section
        id="features"
        ref={(element) => {
          sectionsRef.current[3] = element as HTMLDivElement | null;
        }}
        className="relative overflow-hidden py-12 sm:py-16 md:py-28 lg:py-32 px-4 sm:px-6 md:px-6 isolate"
      >
        {/* Soft background without hard band at the top - properly contained */}
        <div className="absolute inset-0 z-0 bg-gradient-to-b from-[#111111] via-[#060606] to-[#020202]" />
        <div className="absolute inset-x-0 bottom-0 left-0 right-0 h-24 sm:h-28 md:h-32 bg-gradient-to-t from-luxury-black via-transparent to-transparent pointer-events-none z-0" />

        <div className="relative z-10 mx-auto max-w-[1320px]">
          <motion.div className="mb-12 sm:mb-16 md:mb-20 text-center" data-reveal>
            <h2 className="mb-4 sm:mb-5 text-2xl sm:text-3xl md:text-5xl lg:text-6xl font-light tracking-tight">
              <span className="text-white">{t("capabilities.title")}</span>{" "}
              <span className="bg-gradient-to-r from-luxury-gold to-luxury-lightGold bg-clip-text text-transparent">
                {t("capabilities.titleBold")}
              </span>
            </h2>
            <p className="mx-auto max-w-3xl text-sm sm:text-base md:text-lg lg:text-xl text-luxury-silver/70 px-4 sm:px-0">
              {t("capabilities.subtitle")}
            </p>
          </motion.div>

          <div className="grid grid-cols-1 gap-6 sm:gap-8 md:grid-cols-3 md:gap-12">
            {featureItems.map((feature, index) => (
              <FeatureCard key={feature.title} feature={feature} index={index} />
            ))}
          </div>
        </div>
      </section>

      {/* Footer Section – Pixelmatters style with video background - Mobile optimized */}
      <section
        ref={(element) => {
          sectionsRef.current[4] = element as HTMLDivElement | null;
        }}
        className="relative min-h-[50vh] sm:min-h-[60vh] md:min-h-[70vh] flex flex-col justify-between px-4 sm:px-6 md:px-8 lg:px-12 py-12 sm:py-16 md:py-20 lg:py-24 overflow-hidden isolate"
      >
        {/* Video Background - properly contained */}
        <div className="absolute inset-0 z-0 overflow-hidden">
          <video
            ref={(video) => {
              if (video) {
                // Optimal video autoplay handling - ensure video never pauses or breaks
                const forcePlay = async () => {
                  try {
                    if (video.paused && !video.ended) {
                      await video.play();
                    }
                  } catch (error) {
                    console.warn("[WhatWeDoPage] Video autoplay prevented, retrying:", error);
                    // Retry after a short delay with exponential backoff
                    setTimeout(() => {
                      video.play().catch(() => {
                        // Second retry after longer delay
                        setTimeout(() => {
                          video.play().catch(() => {
                            console.warn(
                              "[WhatWeDoPage] Video autoplay failed after multiple retries"
                            );
                          });
                        }, 500);
                      });
                    }, 100);
                  }
                };

                // Handle video ready states
                const handleCanPlay = () => {
                  forcePlay();
                };

                const handleLoadedData = () => {
                  forcePlay();
                };

                // Handle video errors
                const handleError = () => {
                  console.warn("[WhatWeDoPage] Video error occurred");
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

                // Cleanup stored on video element
                (video as any).__cleanup = () => {
                  video.removeEventListener("canplay", handleCanPlay);
                  video.removeEventListener("loadeddata", handleLoadedData);
                  video.removeEventListener("error", handleError);
                  video.removeEventListener("pause", handlePause);
                  video.removeEventListener("ended", handleEnded);
                  video.removeEventListener("waiting", handleWaiting);
                  document.removeEventListener("visibilitychange", handleVisibilityChange);
                  clearInterval(playCheckInterval);
                };
              }
            }}
            autoPlay
            loop
            muted
            playsInline
            preload="auto"
            className="absolute inset-0 w-full h-full transition-opacity duration-1000 z-10"
            style={{
              // ENHANCED: Better proportional scaling for footer video - NO zoom
              objectFit: "cover",
              objectPosition: "center center",
              width: "100%",
              height: "100%",
              transform: "scale(1)", // Explicitly set scale to 1 (no zoom)
              transformOrigin: "center center",
            }}
            disablePictureInPicture
            disableRemotePlayback
          >
            <source
              src={getR2UrlClient("/videos/hero/molten metal slow motion.mp4")}
              type="video/mp4"
            />
          </video>
          {/* ENHANCED: Dark overlay for text readability - properly contained */}
          <div className="absolute inset-0 bg-gradient-to-b from-luxury-black/85 via-luxury-black/75 to-luxury-black/85 z-10" />
        </div>

        {/* Main Content - Centered - Mobile optimized */}
        <div className="relative z-10 mx-auto max-w-4xl text-center flex-1 flex items-center justify-center px-4 sm:px-6">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
            className="text-2xl sm:text-3xl md:text-5xl lg:text-6xl xl:text-7xl font-light leading-tight tracking-tight text-white"
          >
            {t("footer.cta")}
            <br />
            <span className="bg-gradient-to-r from-luxury-gold via-luxury-lightGold to-luxury-gold bg-clip-text text-transparent">
              {t("footer.ctaBold")}
            </span>
          </motion.h2>
        </div>

        {/* Footer Navigation & Social - Bottom - Mobile optimized */}
        <div className="relative z-10 mx-auto w-full max-w-[1320px] flex flex-col md:flex-row items-start md:items-end justify-between gap-6 sm:gap-8 md:gap-0 px-4 sm:px-6">
          {/* Left: Navigation Links */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="flex flex-wrap items-center gap-4 sm:gap-6 md:gap-8"
          >
            <span className="text-white/40 text-sm">×</span>
            <Link
              href={`/${locale}/what-we-do`}
              prefetch={true}
              className="text-sm md:text-base font-medium text-white/80 hover:text-white transition-colors duration-300"
            >
              {tNav("whatWeDo")}
            </Link>
            <Link
              href={`/${locale}/authenticity`}
              prefetch={true}
              className="text-sm md:text-base font-medium text-white/80 hover:text-white transition-colors duration-300"
            >
              {tNav("authenticity")}
            </Link>
            <Link
              href={`/${locale}/products`}
              prefetch={true}
              className="text-sm md:text-base font-medium text-white/80 hover:text-white transition-colors duration-300"
            >
              {tNav("products")}
            </Link>
            <Link
              href={`/${locale}/about`}
              prefetch={true}
              className="text-sm md:text-base font-medium text-white/80 hover:text-white transition-colors duration-300"
            >
              {tNav("aboutUs")}
            </Link>
          </motion.div>

          {/* Right: Social Media Icons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="flex items-center gap-4 md:gap-5"
          >
            <a
              href="https://instagram.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-white/80 hover:text-white transition-colors duration-300"
              aria-label="Instagram"
            >
              <Instagram className="h-5 w-5 md:h-6 md:w-6" />
            </a>
            <a
              href="https://twitter.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-white/80 hover:text-white transition-colors duration-300"
              aria-label="Twitter"
            >
              <Twitter className="h-5 w-5 md:h-6 md:w-6" />
            </a>
            <a
              href="https://linkedin.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-white/80 hover:text-white transition-colors duration-300"
              aria-label="LinkedIn"
            >
              <Linkedin className="h-5 w-5 md:h-6 md:w-6" />
            </a>
            <a
              href="https://youtube.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-white/80 hover:text-white transition-colors duration-300"
              aria-label="YouTube"
            >
              <Youtube className="h-5 w-5 md:h-6 md:w-6" />
            </a>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
