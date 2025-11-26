"use client";

import { useRef, useMemo, useState, useEffect, forwardRef } from "react";
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
  Github,
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
  initial: { opacity: 0, y: 20 },
  animate: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: [0.25, 0.1, 0.25, 1], staggerChildren: 0.1 },
  },
};

const presenceVariants: Variants = {
  initial: { opacity: 0, y: 20 },
  animate: (index = 0) => ({
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.4,
      ease: [0.25, 0.1, 0.25, 1],
      delay: Number(index) * 0.05,
    },
  }),
};

const glassPanelVariants: Variants = {
  initial: { opacity: 0, y: 20 },
  animate: (index = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: [0.25, 0.1, 0.25, 1], delay: Number(index) * 0.05 },
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
    <div ref={containerRef} className="group relative min-h-[280px] sm:min-h-[320px] md:min-h-[360px]">
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
  }
>(({ columns, cards }, ref) => {
  const [hoveredColumnIndex, setHoveredColumnIndex] = useState<number | null>(null);
  const [imageIndices, setImageIndices] = useState<number[]>([0, 0, 0]);
  const [imageLoaded, setImageLoaded] = useState<{ [key: string]: boolean }>({});
  const [imageError, setImageError] = useState<{ [key: string]: boolean }>({});
  const [retryCount, setRetryCount] = useState<{ [key: string]: number }>({});

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

  // Optimized preload strategy - preload all first images immediately for desktop, staggered for mobile
  useEffect(() => {
    // Preload first image for each card with optimized settings
    cards.forEach((card, idx) => {
      if (card.images[0]) {
        const imageUrl = card.images[0];
        
        // Use link preload with fetchpriority for all first images (critical for desktop 3-column layout)
        const link = document.createElement("link");
        link.rel = "preload";
        link.as = "image";
        link.href = imageUrl;
        link.setAttribute("fetchpriority", "high");
        document.head.appendChild(link);

        // Preload with Image object for faster decode and rendering
        const img = new window.Image();
        img.src = imageUrl;
        img.loading = "eager";
        // Only set crossOrigin if it's a remote URL
        if (imageUrl.startsWith("http") && !imageUrl.includes("localhost")) {
          img.crossOrigin = "anonymous";
        }
        
        // Decode all first images immediately for desktop (3-column layout needs all images)
        // For mobile, only first image is critical
        const preloadImage = () => {
          img.decode()
            .then(() => {
              // Image decoded successfully, mark as loaded immediately
              setImageLoaded((prev) => ({
                ...prev,
                [`${idx}-0`]: true,
              }));
            })
            .catch(() => {
              // Silent fail - will be handled by Image component
            });
        };

        // Desktop: decode all first images immediately (they're all visible)
        // Mobile: decode first image immediately, others can wait
        if (!isMobile || idx === 0) {
          // Desktop or mobile first image: decode immediately
          preloadImage();
        } else if (typeof window !== "undefined" && window.requestIdleCallback) {
          // Mobile other images: decode when browser is idle
          window.requestIdleCallback(preloadImage, { timeout: 1000 });
        } else {
          // Fallback for browsers without requestIdleCallback
          setTimeout(preloadImage, 200 * idx);
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

  // Reduced timeout for faster feedback (4 seconds instead of 8)
  useEffect(() => {
    const timeouts: NodeJS.Timeout[] = [];
    
    columns.forEach((_, idx) => {
      const imageKey = `${idx}-0`;
      // Reduced timeout to 4 seconds for faster feedback
      const timeout = setTimeout(() => {
        if (!imageLoaded[imageKey] && !imageError[imageKey]) {
          console.warn(`[NarrativeImageSection] Image loading timeout: ${imageKey}`);
          setImageError((prev) => ({
            ...prev,
            [imageKey]: true,
          }));
        }
      }, 4000);
      timeouts.push(timeout);
    });

    return () => {
      timeouts.forEach((timeout) => clearTimeout(timeout));
    };
  }, [columns.length, imageLoaded, imageError]);

  // Auto-rotate images on hover for desktop with smooth slide transition
  useEffect(() => {
    if (hoveredColumnIndex === null) return;

    // Varied timing for each column (2s, 2.5s, 3s) for more natural feel
    const timings = [2000, 2500, 3000];
    const timing = timings[hoveredColumnIndex] || 2500;

    const interval = setInterval(() => {
      setImageIndices((prev) => {
        const newIndices = [...prev];
        const card = cards[hoveredColumnIndex];
        if (card) {
          const currentIndex = prev[hoveredColumnIndex];
          const nextIndex = (currentIndex + 1) % card.images.length;
          newIndices[hoveredColumnIndex] = nextIndex;
          
          // Preload next image before switching (with decode for better performance)
          if (card.images[nextIndex]) {
            const link = document.createElement("link");
            link.rel = "preload";
            link.as = "image";
            link.href = card.images[nextIndex];
            document.head.appendChild(link);
            
            const img = new window.Image();
            img.src = card.images[nextIndex];
            img.crossOrigin = "anonymous";
            img.decode().catch(() => {
              // Silent fail for preload
            });
          }
        }
        return newIndices;
      });
    }, timing);

    return () => clearInterval(interval);
  }, [hoveredColumnIndex, cards]);

  return (
    <section
      ref={ref}
      className="relative border-t border-white/5 bg-gradient-to-b from-[#050505] via-[#050505] to-[#030303] px-4 sm:px-6 md:px-6 py-12 sm:py-16 md:py-20 lg:py-24 overflow-hidden isolate"
    >
      <div className="relative z-10 mx-auto max-w-[1320px]">
        {/* Desktop: 3-column grid with dynamic hover images - Pixelmatters style */}
        <div className="hidden md:grid md:grid-cols-3 md:gap-6 lg:gap-8 xl:gap-10" data-reveal>
          {columns.map((item, idx) => {
            const card = cards[idx];
            const currentImageIndex = imageIndices[idx];
            const currentImage = card.images[currentImageIndex] || card.images[0];

            return (
              <motion.div
                key={item.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.2 }}
                transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1], delay: idx * 0.06 }}
                onMouseEnter={() => setHoveredColumnIndex(idx)}
                onMouseLeave={() => setHoveredColumnIndex(null)}
                className="flex flex-col gap-6 group"
              >
                {/* Top narrative copy - Pixelmatters spacing with balanced height */}
                <div className="space-y-3 w-full flex flex-col">
                  <h3 className="text-xl md:text-2xl lg:text-[26px] xl:text-[28px] font-semibold leading-[1.2] text-white min-h-[2.5em]">
                    {item.title}
                  </h3>
                  <p className="text-sm md:text-[14px] lg:text-[15px] leading-[1.6] text-luxury-silver/80 min-h-[4.8em]">
                    {item.description}
                  </p>
                </div>

                {/* Image tile with dynamic slide transition on hover - Pixelmatters style */}
                <motion.div
                  whileHover={{ scale: 1.01, y: -2 }}
                  transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                  className="relative w-full overflow-hidden rounded-lg border border-white/10 bg-black/60 flex-shrink-0"
                  style={{ aspectRatio: "3/2" }}
                >
                  {/* Image container with optimized loading and error handling */}
                  <div className="relative w-full h-full overflow-hidden bg-black/40 isolate">
                    {/* Loading placeholder with timeout */}
                    {!imageLoaded[`${idx}-${currentImageIndex}`] && !imageError[`${idx}-${currentImageIndex}`] && (
                      <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-black/60 to-black/40 z-10">
                        <div className="h-6 w-6 sm:h-8 sm:w-8 animate-spin rounded-full border-2 border-white/20 border-t-white/60" />
                      </div>
                    )}
                    
                    <AnimatePresence mode="wait" initial={false}>
                      {!imageError[`${idx}-${currentImageIndex}`] && (
                      <motion.div
                        key={`${idx}-${currentImageIndex}`}
                          initial={{ opacity: 0 }}
                        animate={{ 
                            opacity: imageLoaded[`${idx}-${currentImageIndex}`] ? 1 : 0
                          }}
                          exit={{ opacity: 0 }}
                          transition={{
                            duration: 0.2,
                            ease: [0.25, 0.1, 0.25, 1],
                        }}
                        className="absolute inset-0"
                      >
                        <Image
                          src={currentImage}
                          alt={card.label}
                          fill
                          className="object-cover"
                          sizes="(max-width: 768px) 100vw, (max-width: 1280px) 33vw, 440px"
                          priority={currentImageIndex === 0}
                          loading={currentImageIndex === 0 ? "eager" : "lazy"}
                          quality={isMobile ? 80 : 90}
                          unoptimized={false}
                          placeholder="blur"
                          blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAAIAAoDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAhEAACAQMDBQAAAAAAAAAAAAABAgMABAUGIWGRkqGx0f/EABUBAQEAAAAAAAAAAAAAAAAAAAMF/8QAGhEAAgIDAAAAAAAAAAAAAAAAAAECEgMRkf/aAAwDAQACEQMRAD8AltJagyeH0AthI5xdrLcNM91BF5pX2HaH9bcfaSXWGaRmknyJckliyjqTzSlT54b6bk+h0R//2Q=="
                          decoding="async"
                          fetchPriority={currentImageIndex === 0 ? "high" : "auto"}
                          onLoad={(e) => {
                            const imageKey = `${idx}-${currentImageIndex}`;
                            if (process.env.NODE_ENV === 'development') {
                              console.log(`[NarrativeImageSection] Image loaded successfully: ${imageKey}`, currentImage);
                            }
                            setImageLoaded((prev) => ({
                              ...prev,
                              [imageKey]: true,
                            }));
                            setImageError((prev) => {
                              const newState = { ...prev };
                              delete newState[imageKey];
                              return newState;
                            });
                          }}
                          onError={(e) => {
                            const imageKey = `${idx}-${currentImageIndex}`;
                            const currentRetry = retryCount[imageKey] || 0;
                            
                            console.error(`[NarrativeImageSection] Image load error (attempt ${currentRetry + 1}): ${currentImage}`, e);
                            
                            // Retry up to 2 times
                            if (currentRetry < 2) {
                              console.warn(`[NarrativeImageSection] Retrying image load (${currentRetry + 1}/2): ${currentImage}`);
                              setRetryCount((prev) => ({
                                ...prev,
                                [imageKey]: currentRetry + 1,
                              }));
                              
                              // Retry after delay
                              setTimeout(() => {
                                const img = new window.Image();
                                img.src = currentImage;
                                img.onload = () => {
                                  if (process.env.NODE_ENV === 'development') {
                                    console.log(`[NarrativeImageSection] Retry successful for: ${imageKey}`);
                                  }
                                  setImageLoaded((prev) => ({
                                    ...prev,
                                    [imageKey]: true,
                                  }));
                                  setImageError((prev) => {
                                    const newState = { ...prev };
                                    delete newState[imageKey];
                                    return newState;
                                  });
                                };
                                img.onerror = () => {
                                  console.error(`[NarrativeImageSection] Retry failed for: ${imageKey}`);
                                  if (currentRetry + 1 >= 2) {
                                    setImageError((prev) => ({
                                      ...prev,
                                      [imageKey]: true,
                                    }));
                                  }
                                };
                              }, 1000 * (currentRetry + 1));
                            } else {
                              console.error(`[NarrativeImageSection] Failed to load image after ${currentRetry + 1} retries: ${currentImage}`);
                              setImageError((prev) => ({
                                ...prev,
                                [imageKey]: true,
                              }));
                            }
                          }}
                          onLoadingComplete={() => {
                            const imageKey = `${idx}-${currentImageIndex}`;
                            setImageLoaded((prev) => ({
                              ...prev,
                              [imageKey]: true,
                            }));
                          }}
                        />
                      </motion.div>
                      )}
                    </AnimatePresence>
                    
                    {/* Error fallback */}
                    {imageError[`${idx}-${currentImageIndex}`] && (
                      <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-black/80 to-black/60 z-10">
                        <p className="text-xs sm:text-sm text-white/60 px-4 text-center">Image unavailable</p>
                  </div>
                    )}
                  </div>
                  {/* Vignette overlay - properly contained and optimized */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent pointer-events-none z-[1] rounded-lg" />

                  <div className="absolute inset-x-0 bottom-0 p-4 md:p-5 pointer-events-none z-[2]">
                    <p className="text-sm md:text-base font-semibold text-white mb-1">
                      {card.label}
                    </p>
                    <p className="text-xs md:text-sm leading-[1.5] text-luxury-silver/85">
                      {card.caption}
                    </p>
                  </div>
                </motion.div>
              </motion.div>
            );
          })}
        </div>

        {/* Mobile: Pixelmatters-style layout - Text stacked, then single large image - Optimized */}
        <div className="md:hidden">
          {/* Text sections – stacked vertically like Pixelmatters - Mobile optimized spacing */}
          <div className="mb-12 sm:mb-16 space-y-10 sm:space-y-14" data-reveal>
            {columns.map((item, idx) => (
              <motion.div
                key={item.title}
                initial={{ opacity: 0, y: 15 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.2 }}
                transition={{ duration: 0.5, delay: idx * 0.08, ease: [0.22, 1, 0.36, 1] }}
                className="space-y-2.5 sm:space-y-3"
              >
                <h3 className="text-[1.5rem] sm:text-[2rem] font-semibold leading-tight sm:leading-[1.2] text-white">
                  {item.title}
                </h3>
                <p className="text-sm sm:text-[15px] leading-relaxed sm:leading-[1.6] text-luxury-silver/80">
                  {item.description}
                </p>
              </motion.div>
            ))}
          </div>

          {/* Single large image – Pixelmatters style full-width edge-to-edge - Mobile optimized with error handling */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            className="relative w-screen left-1/2 right-1/2 -ml-[50vw] -mr-[50vw] overflow-hidden bg-black/40 isolate"
            style={{ aspectRatio: "4/3" }}
            data-reveal
          >
            {/* Loading state */}
            {!imageLoaded["mobile-0"] && !imageError["mobile-0"] && (
              <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-black/60 to-black/40 z-10">
                <div className="h-10 w-10 animate-spin rounded-full border-2 border-white/20 border-t-white/60" />
              </div>
            )}
            
            {/* Image with error handling - Optimized for mobile */}
            {!imageError["mobile-0"] && (
            <Image
              src={cards[0].images[0]}
              alt={cards[0].label}
              fill
              className="object-cover"
              sizes="100vw"
              priority
              quality={85}
              loading="eager"
              unoptimized={false}
              placeholder="blur"
              blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAAIAAoDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAhEAACAQMDBQAAAAAAAAAAAAABAgMABAUGIWGRkqGx0f/EABUBAQEAAAAAAAAAAAAAAAAAAAMF/8QAGhEAAgIDAAAAAAAAAAAAAAAAAAECEgMRkf/aAAwDAQACEQMRAD8AltJagyeH0AthI5xdrLcNM91BF5pX2HaH9bcfaSXWGaRmknyJckliyjqTzSlT54b6bk+h0R//2Q=="
              decoding="async"
              fetchPriority="high"
              onLoad={(e) => {
                if (process.env.NODE_ENV === 'development') {
                  console.log(`[NarrativeImageSection] Mobile image loaded successfully:`, cards[0].images[0]);
                }
                setImageLoaded((prev) => ({
                  ...prev,
                  "mobile-0": true,
                }));
                setImageError((prev) => {
                  const newState = { ...prev };
                  delete newState["mobile-0"];
                  return newState;
                });
              }}
              onError={(e) => {
                const currentRetry = retryCount["mobile-0"] || 0;
                console.error(`[NarrativeImageSection] Mobile image load error (attempt ${currentRetry + 1}): ${cards[0].images[0]}`, e);
                
                // Retry up to 2 times
                if (currentRetry < 2) {
                  console.warn(`[NarrativeImageSection] Retrying mobile image load (${currentRetry + 1}/2): ${cards[0].images[0]}`);
                  setRetryCount((prev) => ({
                    ...prev,
                    "mobile-0": currentRetry + 1,
                  }));
                  
                  // Retry after delay
                  setTimeout(() => {
                    const img = new window.Image();
                    img.src = cards[0].images[0];
                    img.onload = () => {
                      if (process.env.NODE_ENV === 'development') {
                        console.log(`[NarrativeImageSection] Mobile retry successful`);
                      }
                      setImageLoaded((prev) => ({
                        ...prev,
                        "mobile-0": true,
                      }));
                      setImageError((prev) => {
                        const newState = { ...prev };
                        delete newState["mobile-0"];
                        return newState;
                      });
                    };
                    img.onerror = () => {
                      console.error(`[NarrativeImageSection] Mobile retry failed`);
                      if (currentRetry + 1 >= 2) {
                        setImageError((prev) => ({
                          ...prev,
                          "mobile-0": true,
                        }));
                      }
                    };
                  }, 1000 * (currentRetry + 1));
                } else {
                  console.error(`[NarrativeImageSection] Failed to load mobile image after ${currentRetry + 1} retries: ${cards[0].images[0]}`);
                  setImageError((prev) => ({
                    ...prev,
                    "mobile-0": true,
                  }));
                }
              }}
              onLoadingComplete={() => {
                setImageLoaded((prev) => ({
                  ...prev,
                  "mobile-0": true,
                }));
              }}
              style={{
                opacity: imageLoaded["mobile-0"] ? 1 : 0,
                transition: "opacity 0.3s ease-out",
              }}
            />
            )}
            
            {/* Error fallback */}
            {imageError["mobile-0"] && (
              <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-black/80 to-black/60 z-10">
                <div className="text-center px-4">
                  <p className="text-base text-white/60 mb-2">Image unavailable</p>
                  <p className="text-sm text-white/40">{cards[0].label}</p>
                </div>
              </div>
            )}
            
            {/* Vignette overlay - properly contained and optimized for mobile */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent pointer-events-none z-[1]" />

            <div className="absolute inset-x-0 bottom-0 p-4 sm:p-5 z-[2] pointer-events-none">
              <p className="text-sm sm:text-base font-semibold text-white mb-1 sm:mb-1.5">
                {cards[0].label}
              </p>
              <p className="text-xs sm:text-sm leading-relaxed text-luxury-silver/85">
                {cards[0].caption}
              </p>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
});

NarrativeImageSection.displayName = "NarrativeImageSection";

// End of file helpers

export default function WhatWeDoPage() {
  const pageRef = useRef<HTMLDivElement | null>(null);
  const heroRef = useRef<HTMLDivElement | null>(null);
  const noiseOverlay = useRef<HTMLDivElement | null>(null);
  const gradientOverlay = useRef<HTMLDivElement | null>(null);
  const sectionsRef = useRef<(HTMLDivElement | null)[]>([]);

  const featureItems = useMemo(
    () => [
      {
        title: "Gold, Silver & Palladium Fabrication",
        description:
          "High-purity bullion manufacturing from 5gr to 500gr. Expert craftsmanship meeting international standards.",
        icon: Sparkles,
        gradient: "from-luxury-gold to-luxury-lightGold",
      },
      {
        title: "Advanced Purity Lab",
        description:
          "Spectrometry testing ensuring 99.99% quality. ISO 9001 certified facilities with transparent compliance.",
        icon: FlaskConical,
        gradient: "from-luxury-silver to-white",
      },
      {
        title: "QR-Authenticated Security",
        description:
          "Each bar integrated with unique, encrypted traceability. Blockchain-ready verification system.",
        icon: Shield,
        gradient: "from-luxury-gold to-luxury-lightGold",
      },
    ],
    []
  );

  const premiumGradient = useMemo(
    () =>
      "linear-gradient(160deg, rgba(18,18,18,0.94) 0%, rgba(10,10,10,0.98) 55%, rgba(6,6,6,1) 100%)",
    []
  );

  const narrativeColumns = [
    {
      title: "Craft from raw bullion",
      description:
        "We transform responsibly sourced gold, silver, and palladium into investment-grade bars using tightly controlled refining and casting lines.",
    },
    {
      title: "Engineer authenticity into every bar",
      description:
        "Each piece is born with a unique serial, lab-backed purity data, and encrypted QR that ties physical metal to its digital identity.",
    },
    {
      title: "Scale verified precious metal flows",
      description:
        "From mint to vault to client, telemetry and scan events keep partners aligned on provenance, custody, and lifecycle events.",
    },
  ] as const;

  // Helper to get image URL - will use R2 if configured, otherwise fallback to local path
  const getImageUrl = (path: string): string => {
    return getR2UrlClient(path);
  };

  const narrativeCards = [
    {
      label: "Gold fabrication lines",
      caption:
        "High‑throughput casting, edge finishing, and surface treatment tuned for bullion batches.",
      images: [
        getImageUrl("/images/pexels-3d-render-1058120333-33539240.jpg"),
        getImageUrl("/images/pexels-sejio402-29336321.jpg"),
        getImageUrl("/images/silverking-gold.jpeg"),
      ],
    },
    {
      label: "Silver & palladium refinement",
      caption:
        "Spectrometry‑backed purification with ISO‑aligned quality controls for industrial and retail bars.",
      images: [
        getImageUrl("/images/pexels-michael-steinberg-95604-386318.jpg"),
        getImageUrl("/images/pexels-sejio402-29336326.jpg"),
        getImageUrl("/images/silverking-gold.jpeg"),
      ],
    },
    {
      label: "Digital verification stack",
      caption:
        "QR issuance, scan logging, and risk signals wired directly into Silver King Command.",
      images: [
        getImageUrl("/images/pexels-sejio402-29336327.jpg"),
        getImageUrl("/images/pexels-sejio402-29336321.jpg"),
        getImageUrl("/images/silverking-gold.jpeg"),
      ],
    },
  ] as const;

  useGSAP(
    () => {
      if (!pageRef.current) return;

      const ctx = gsap.context(() => {
        gsap.set("[data-reveal]", { autoAlpha: 0, y: 20 });

        sectionsRef.current.forEach((section) => {
          if (!section) return;
          const targets = section.querySelectorAll("[data-reveal]");

          ScrollTrigger.batch(targets, {
            start: "top 85%",
            onEnter: (batch) =>
              gsap.to(batch, {
                autoAlpha: 1,
                y: 0,
                duration: 0.4,
                stagger: 0.08,
                ease: "power2.out",
              }),
            once: true,
          });
        });

        if (heroRef.current) {
          const heroTimeline = gsap.timeline({ defaults: { ease: "power2.out" } });
          heroTimeline.fromTo(
            heroRef.current.querySelectorAll("[data-hero]") || [],
            { autoAlpha: 0, y: 20 },
            { autoAlpha: 1, y: 0, duration: 0.5, stagger: 0.1 }
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
                            console.warn("[WhatWeDoPage] Video autoplay failed after multiple retries");
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
            className="absolute inset-0 h-full w-full object-cover transition-opacity duration-1000 will-change-transform z-10"
            style={{ transform: "scale(1.05)", transformOrigin: "center center" }}
            disablePictureInPicture
            disableRemotePlayback
          >
            <source src={getR2UrlClient("/videos/hero/metal crafting hands.mp4")} type="video/mp4" />
          </video>

          {/* Dark overlays for readability - properly contained */}
          <div className="absolute inset-0 bg-gradient-to-b from-black/55 via-black/45 to-black/65 z-20" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,rgba(10,10,10,0.6)_100%)] z-20" />
          <div className="absolute inset-x-0 bottom-0 left-0 right-0 h-40 md:h-52 lg:h-64 bg-gradient-to-t from-luxury-black via-luxury-black/60 to-transparent pointer-events-none z-20" />
        </div>
      </div>

      {/* Hero Section – typography & layout aligned with products hero - Mobile optimized */}
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
              className="text-[1.75rem] sm:text-[2rem] md:text-[3.5rem] lg:text-[2.5rem] xl:text-[3.5rem] 2xl:text-[4rem] font-light leading-tight sm:leading-[1.15] tracking-tight md:tracking-[-0.02em] lg:tracking-[-0.03em] text-white"
              data-hero
            >
              Engineering the lifecycle
              <br />
              <span className="font-normal">of every Silver King bar.</span>
            </motion.h1>
            <motion.p
              data-hero
              className="mt-4 sm:mt-6 max-w-xl text-sm sm:text-[0.9375rem] md:text-base font-light leading-relaxed text-luxury-silver/80"
            >
              From ore selection and purification to serial coding, QR sealing, and verification, we
              choreograph each step so every bar carries a verifiable story of origin and custody.
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
              The impact
              <br />
              you can expect
            </h2>
          </div>

          {/* Right list of impacts - Mobile optimized */}
          <div className="flex-1 space-y-8 sm:space-y-10 md:space-y-6" data-reveal>
            {[
              {
                title: "Traceable supply chains",
                body: "Every Silver King bar carries a verifiable story of origin, custody, and verification events, giving partners confidence in each transfer.",
              },
              {
                title: "Operational clarity",
                body: "Live telemetry from scans turns scattered movements into structured data, helping you see what is moving, where, and through whom.",
              },
              {
                title: "Customer trust at scale",
                body: "A single tap on the QR reveals authenticity, provenance, and product details, building long‑term trust with collectors and institutions.",
              },
              {
                title: "Compliance‑ready records",
                body: "Audit‑friendly logs and standardized identifiers simplify reporting across jurisdictions and support stringent regulatory frameworks.",
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
            <span>Explore Silver King advantages</span>
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
              <span className="text-white">Our</span>{" "}
              <span className="bg-gradient-to-r from-luxury-gold to-luxury-lightGold bg-clip-text text-transparent">
                Capabilities
              </span>
            </h2>
            <p className="mx-auto max-w-3xl text-sm sm:text-base md:text-lg lg:text-xl text-luxury-silver/70 px-4 sm:px-0">
              Precision engineering meets uncompromising quality standards
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
                            console.warn("[WhatWeDoPage] Video autoplay failed after multiple retries");
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
            className="absolute inset-0 w-full h-full object-cover"
            disablePictureInPicture
            disableRemotePlayback
          >
            <source src={getR2UrlClient("/videos/hero/molten metal slow motion.mp4")} type="video/mp4" />
          </video>
          {/* Dark overlay for text readability - properly contained */}
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
            Let's raise the bar,
            <br />
            <span className="bg-gradient-to-r from-luxury-gold via-luxury-lightGold to-luxury-gold bg-clip-text text-transparent">
              together.
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
              href="/what-we-do"
              className="text-sm md:text-base font-medium text-white/80 hover:text-white transition-colors duration-300"
            >
              What we do
            </Link>
            <Link
              href="/authenticity"
              className="text-sm md:text-base font-medium text-white/80 hover:text-white transition-colors duration-300"
            >
              Authenticity
            </Link>
            <Link
              href="/products"
              className="text-sm md:text-base font-medium text-white/80 hover:text-white transition-colors duration-300"
            >
              Products
            </Link>
            <Link
              href="/about"
              className="text-sm md:text-base font-medium text-white/80 hover:text-white transition-colors duration-300"
            >
              About us
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
              href="https://github.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-white/80 hover:text-white transition-colors duration-300"
              aria-label="GitHub"
            >
              <Github className="h-5 w-5 md:h-6 md:w-6" />
            </a>
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
