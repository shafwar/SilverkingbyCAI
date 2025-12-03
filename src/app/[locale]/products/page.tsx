"use client";

import Navbar from "@/components/layout/Navbar";
import { motion, AnimatePresence, type Variants } from "framer-motion";
import Link from "next/link";
import { Sparkles, Gem, ArrowRight, Shield, ArrowDown, QrCode } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { APP_NAME } from "@/utils/constants";
import { useRef, useState, useEffect, useMemo } from "react";
import { useTranslations, useLocale } from "next-intl";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import ProductModal, { type Product } from "@/components/ui/ProductModal";
import ProductCard, { type ProductWithPricing } from "@/components/ui/ProductCard";
import { getR2UrlClient } from "@/utils/r2-url";

gsap.registerPlugin(ScrollTrigger);

const revealVariants: Variants = {
  initial: { opacity: 0, y: 40 },
  animate: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: "easeOut", staggerChildren: 0.15 },
  },
};

const cardVariants: Variants = {
  initial: { opacity: 0, y: 32, scale: 0.96 },
  animate: (index = 0) => ({
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: 0.6,
      ease: [0.22, 1, 0.36, 1],
      delay: Number(index) * 0.1,
    },
  }),
  exit: {
    opacity: 0,
    scale: 0.9,
    transition: { duration: 0.3, ease: "easeIn" },
  },
};

const bottomSectionVariants: Variants = {
  initial: { opacity: 0, y: 60 },
  animate: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.8,
      ease: [0.22, 1, 0.36, 1],
      staggerChildren: 0.2,
    },
  },
};

const textRevealVariants: Variants = {
  initial: { opacity: 0, y: 40 },
  animate: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.8,
      ease: [0.22, 1, 0.36, 1],
    },
  },
};

const ctaCardVariants: Variants = {
  initial: { opacity: 0, y: 50, scale: 0.95 },
  animate: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: 0.8,
      ease: [0.22, 1, 0.36, 1],
      delay: 0.4,
    },
  },
};

type ProductCategory = {
  icon: LucideIcon;
  title: string;
  description: string;
  gradient: string;
  products: Product[];
};

// allProducts will be created inside component using translations

// Category list for filtering - will be created inside component using translations

// Product Category Grid Item with Hover Slideshow
const CategoryGridItem = ({
  category,
  index,
  onProductSelect,
  t,
}: {
  category: ProductCategory;
  index: number;
  onProductSelect: (product: Product) => void;
  t: (key: string) => string;
}) => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const slideIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (isHovered && category.products.length > 1) {
      slideIntervalRef.current = setInterval(() => {
        setCurrentSlide((prev) => (prev + 1) % category.products.length);
      }, 2000);
    } else {
      if (slideIntervalRef.current) {
        clearInterval(slideIntervalRef.current);
      }
    }

    return () => {
      if (slideIntervalRef.current) {
        clearInterval(slideIntervalRef.current);
      }
    };
  }, [isHovered, category.products.length]);

  const handleMouseEnter = () => {
    setIsHovered(true);
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    setCurrentSlide(0);
  };

  return (
    <motion.div
      variants={cardVariants}
      initial="initial"
      whileInView="animate"
      viewport={{ once: true, amount: 0.3 }}
      custom={index}
      className="group relative flex flex-col h-full p-6 md:p-8"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Product Name - Top Section - FIXED HEIGHT */}
      <div className="mb-8 min-h-[140px] flex flex-col">
        <h3 className="text-2xl font-light tracking-tight text-white transition-colors duration-300 group-hover:text-luxury-gold/90 md:text-3xl">
          {category.title}
        </h3>
        <p className="mt-3 text-sm font-light leading-relaxed text-white/60 md:text-base line-clamp-3">
          {category.description}
        </p>
      </div>

      {/* Slideshow - Bottom Section - FLEX GROW */}
      <div className="relative aspect-[4/3] overflow-hidden rounded-lg bg-gradient-to-br from-luxury-black/80 to-luxury-black transition-all duration-500">
        {/* Image Slideshow */}
        <div className="relative h-full w-full">
          {category.products.map((product, idx) => (
            <motion.div
              key={product.id}
              className="absolute inset-0 cursor-pointer"
              initial={false}
              animate={{
                opacity: idx === currentSlide ? 1 : 0,
                scale: idx === currentSlide ? 1 : 1.05,
              }}
              transition={{ duration: 0.6, ease: "easeInOut" }}
              onClick={() => onProductSelect(product)}
            >
              {/* Fallback gradient background */}
              <div
                className={`absolute inset-0 bg-gradient-to-br ${category.gradient} opacity-20`}
              />

              {/* Product Image or Icon */}
              {product.image ? (
                <img
                  src={product.image}
                  alt={product.name}
                  className="h-full w-full object-cover"
                  onError={(e) => {
                    e.currentTarget.style.display = "none";
                  }}
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center">
                  {(() => {
                    const IconComponent = category.icon;
                    return (
                      <IconComponent className="h-24 w-24 text-white/30 transition-all duration-500 group-hover:text-white/50 group-hover:scale-110" />
                    );
                  })()}
                </div>
              )}

              {/* Overlay gradient */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

              {/* Product info overlay */}
              <div className="absolute bottom-0 left-0 right-0 p-6">
                <h4 className="mb-1 text-lg font-medium text-white">{product.name}</h4>
                <div className="flex items-center gap-3 text-xs text-white/70">
                  <span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-2 py-1">
                    <Sparkles className="h-3 w-3" />
                    {product.purity}
                  </span>
                  <span>•</span>
                  <span>{product.weight}</span>
                </div>
              </div>
            </motion.div>
          ))}

          {/* Slide indicators */}
          {category.products.length > 1 && isHovered && (
            <div className="absolute bottom-4 right-4 flex gap-2">
              {category.products.map((_, idx) => (
                <div
                  key={idx}
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    idx === currentSlide ? "w-6 bg-white" : "w-1.5 bg-white/30"
                  }`}
                />
              ))}
            </div>
          )}
        </div>

        {/* Hover overlay hint */}
        {!isHovered && category.products.length > 1 && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
            <div className="rounded-full bg-white/10 px-4 py-2 text-xs text-white/80 backdrop-blur-sm">
              {t("hoverToView")}
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default function ProductsPage() {
  const t = useTranslations("products");
  const tNav = useTranslations("nav");
  const locale = useLocale();
  const pageRef = useRef<HTMLDivElement | null>(null);
  const heroRef = useRef<HTMLDivElement | null>(null);
  const scrollIndicatorRef = useRef<HTMLDivElement | null>(null);
  const sectionsRef = useRef<(HTMLElement | null)[]>([]);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const fadeOverlayRef = useRef<HTMLDivElement | null>(null);
  const bottomSectionRef = useRef<HTMLDivElement | null>(null);
  const readingTextRef = useRef<HTMLDivElement | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isVideoLoaded, setIsVideoLoaded] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedFilter, setSelectedFilter] = useState<string>("all");
  const [isMounted, setIsMounted] = useState(false);

  // CRITICAL: Delay heavy animations until after initial render
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Enable smooth scroll behavior for fluid scrolling
  useEffect(() => {
    if (typeof window !== "undefined") {
      // Apply smooth scroll to html element
      document.documentElement.style.scrollBehavior = "smooth";

      return () => {
        // Cleanup on unmount
        document.documentElement.style.scrollBehavior = "auto";
      };
    }
  }, []);

  // CRITICAL: Prefetch other pages when this page loads
  // This ensures fast navigation when user clicks nav links
  useEffect(() => {
    if (typeof window !== "undefined") {
      const paths = ["/", "/what-we-do", "/authenticity", "/about", "/contact"];
      paths.forEach((path) => {
        try {
          const fullPath = locale === "en" ? path : `/${locale}${path === "/" ? "" : path}`;
          // Prefetch using link element
          const link = document.createElement("link");
          link.rel = "prefetch";
          link.as = "document";
          link.href = fullPath;
          document.head.appendChild(link);

          // Also prefetch RSC payload
          const rscLink = document.createElement("link");
          rscLink.rel = "prefetch";
          rscLink.as = "fetch";
          rscLink.href = `${fullPath}?_rsc=`;
          rscLink.crossOrigin = "anonymous";
          document.head.appendChild(rscLink);
        } catch (error) {
          // Silently fail
        }
      });
    }
  }, [locale]);

  // Product categories with translations
  const productCategories = useMemo<ProductCategory[]>(
    () => [
      {
        icon: Gem,
        title: t("categories.250gram.title"),
        description: t("categories.250gram.description"),
        gradient: "from-luxury-gold to-luxury-lightGold",
        products: [],
      },
      {
        icon: Gem,
        title: t("categories.100gram.title"),
        description: t("categories.100gram.description"),
        gradient: "from-luxury-gold via-luxury-lightGold to-luxury-gold",
        products: [],
      },
      {
        icon: Gem,
        title: t("categories.50gram.title"),
        description: t("categories.50gram.description"),
        gradient: "from-luxury-gold to-luxury-silver",
        products: [],
      },
      {
        icon: Gem,
        title: t("categories.25gram.title"),
        description: t("categories.25gram.description"),
        gradient: "from-luxury-silver to-luxury-lightSilver",
        products: [],
      },
      {
        icon: Gem,
        title: t("categories.10gram.title"),
        description: t("categories.10gram.description"),
        gradient: "from-luxury-lightSilver to-luxury-silver",
        products: [],
      },
      {
        icon: Gem,
        title: t("categories.5gram.title"),
        description: t("categories.5gram.description"),
        gradient: "from-luxury-silver via-luxury-gold to-luxury-lightSilver",
        products: [],
      },
    ],
    [t]
  );

  // All products with translations - Grouped products with multiple images
  const allProducts = useMemo<ProductWithPricing[]>(
    () => [
      {
        id: "1",
        name: "50gr",
        rangeName: t("product.rangeName"),
        image: "/images/50gr.jpeg",
        purity: t("product.purity"),
        weight: "50gr",
        description: `${t("product.description")}`,
        category: t("categories.50gram.title"),
        // Additional images for slider
        images: ["/images/50gr.jpeg", "/images/50gr(2).jpeg"],
      },
      {
        id: "3",
        name: "100gr",
        rangeName: t("product.rangeName"),
        image: "/images/100gr.jpeg",
        purity: t("product.purity"),
        weight: "100gr",
        description: `${t("product.description")}`,
        category: t("categories.100gram.title"),
        // Additional images for slider
        images: ["/images/100gr.jpeg", "/images/100gr(2).jpeg"],
      },
      {
        id: "5",
        name: "100gr",
        rangeName: t("product.rangeName"),
        image: "/images/silverking-gold.jpeg",
        purity: t("product.purity"),
        weight: "100gr",
        description: `${t("product.description")}`,
        category: t("categories.100gram.title"),
      },
    ],
    [t]
  );

  const handleProductSelect = (product: Product) => {
    setSelectedProduct(product);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setTimeout(() => setSelectedProduct(null), 300);
  };

  // Video autoplay is now handled in the video ref callback
  // This useEffect is kept for cleanup if needed, but video handling is in ref

  useGSAP(
    () => {
      if (!pageRef.current || !isMounted) return;

      // CRITICAL: Use requestIdleCallback to defer heavy animations
      const initAnimations = () => {
        const ctx = gsap.context(() => {
          // Video is now full screen with no zoom - no GSAP animation needed
          // Video styling is handled via CSS (transform: none, width: 100vw, height: 100vh)

          // Hero animation with stagger
          if (heroRef.current) {
            const heroElements = heroRef.current.querySelectorAll("[data-hero]");
            const heroAccentElements = heroRef.current.querySelectorAll("[data-hero-accent]");

            if (heroElements.length > 0 || heroAccentElements.length > 0) {
              const heroTimeline = gsap.timeline({ defaults: { ease: "power3.out" } });

              if (heroElements.length > 0) {
                heroTimeline.fromTo(
                  heroElements,
                  { autoAlpha: 0, y: 60, scale: 0.95 },
                  { autoAlpha: 1, y: 0, scale: 1, duration: 1, stagger: 0.2 }
                );
              }

              if (heroAccentElements.length > 0) {
                heroTimeline.fromTo(
                  heroAccentElements,
                  { scale: 0, rotate: -180 },
                  { scale: 1, rotate: 0, duration: 0.8, ease: "back.out(1.7)" },
                  "<0.3"
                );
              }
            }
          }

          // Scroll Indicator Animation - Fluid scroll effect with GSAP
          if (scrollIndicatorRef.current && sectionsRef.current[0] && sectionsRef.current[1]) {
            const heroSection = sectionsRef.current[0];
            const productSection = sectionsRef.current[1];
            const indicator = scrollIndicatorRef.current;
            const mouseIcon = indicator.querySelector("[data-mouse-icon]");
            const scrollWheel = indicator.querySelector("[data-scroll-wheel]");
            const scrollDot = indicator.querySelector("[data-scroll-dot]");

            // Fluid floating animation for mouse icon
            if (mouseIcon) {
              gsap.to(mouseIcon, {
                y: 6,
                duration: 2,
                repeat: -1,
                yoyo: true,
                ease: "sine.inOut",
              });
            }

            // Fluid scroll wheel animation - subtle bounce
            if (scrollWheel) {
              gsap.to(scrollWheel, {
                y: 3,
                duration: 1.8,
                repeat: -1,
                yoyo: true,
                ease: "power1.inOut",
              });
            }

            // Fluid scroll dot animation - continuous smooth flow
            if (scrollDot) {
              const scrollDotAnimation = gsap.to(scrollDot, {
                y: 48,
                duration: 2,
                repeat: -1,
                ease: "none",
              });

              // Reset position on repeat for seamless loop
              scrollDotAnimation.eventCallback("onRepeat", () => {
                gsap.set(scrollDot, { y: 0 });
              });
            }

            // Smooth fade out scroll indicator when scrolling - fluid transition
            ScrollTrigger.create({
              trigger: heroSection,
              start: "bottom 85%",
              end: "bottom 15%",
              scrub: 0.5,
              onUpdate: (self) => {
                const progress = self.progress;
                gsap.to(indicator, {
                  opacity: 1 - progress,
                  scale: 1 - progress * 0.2,
                  y: progress * 20,
                  duration: 0.1,
                  ease: "power1.out",
                });
              },
            });

            // Hide completely when product section is in view - smooth fade
            ScrollTrigger.create({
              trigger: productSection,
              start: "top 95%",
              end: "top 60%",
              scrub: 0.5,
              onUpdate: (self) => {
                const progress = self.progress;
                gsap.to(indicator, {
                  opacity: Math.max(0, 1 - progress * 1.5),
                  scale: Math.max(0.7, 1 - progress * 0.3),
                  duration: 0.1,
                  ease: "power1.out",
                });
              },
            });
          }

          // Fade to black effect when scrolling from hero to product section
          if (fadeOverlayRef.current && sectionsRef.current[0] && sectionsRef.current[1]) {
            const heroSection = sectionsRef.current[0];
            const productSection = sectionsRef.current[1];

            // Initialize overlay opacity
            gsap.set(fadeOverlayRef.current, { opacity: 0 });

            ScrollTrigger.create({
              trigger: heroSection,
              start: "bottom center",
              end: "bottom top",
              scrub: 0.5,
              onUpdate: (self) => {
                const progress = self.progress;
                // Fade overlay to black
                if (fadeOverlayRef.current) {
                  gsap.to(fadeOverlayRef.current, {
                    opacity: progress,
                    duration: 0.1,
                    ease: "none",
                  });
                }
                // Also fade video opacity gradually
                if (videoRef.current) {
                  const videoOpacity = Math.max(0.1, 1 - progress * 0.9);
                  gsap.to(videoRef.current, {
                    opacity: videoOpacity,
                    duration: 0.1,
                    ease: "none",
                  });
                }
              },
            });

            // Additional fade when product section comes into view
            ScrollTrigger.create({
              trigger: productSection,
              start: "top center",
              end: "top top",
              scrub: 0.5,
              onUpdate: (self) => {
                const progress = self.progress;
                // Complete fade to black
                if (fadeOverlayRef.current) {
                  gsap.to(fadeOverlayRef.current, {
                    opacity: Math.min(1, 0.5 + progress * 0.5),
                    duration: 0.1,
                    ease: "none",
                  });
                }
                // Fade video completely
                if (videoRef.current) {
                  const videoOpacity = Math.max(0.05, 0.1 - progress * 0.05);
                  gsap.to(videoRef.current, {
                    opacity: videoOpacity,
                    duration: 0.1,
                    ease: "none",
                  });
                }
              },
            });
          }

          // Section reveal with ScrollTrigger
          sectionsRef.current.forEach((section) => {
            if (!section) return;
            const targets = section.querySelectorAll("[data-reveal]");

            if (targets.length > 0) {
              ScrollTrigger.batch(targets, {
                start: "top 85%",
                onEnter: (batch) =>
                  gsap.to(batch, {
                    autoAlpha: 1,
                    y: 0,
                    duration: 0.8,
                    stagger: 0.15,
                    ease: "power3.out",
                  }),
                once: true,
              });
            }
          });

          // Floating animation for accents
          const floatElements = document.querySelectorAll("[data-float]");
          if (floatElements.length > 0) {
            gsap.to(floatElements, {
              y: "random(-20, 20)",
              duration: "random(2, 4)",
              repeat: -1,
              yoyo: true,
              ease: "power1.inOut",
              stagger: {
                each: 0.2,
                from: "random",
              },
            });
          }

          // Bottom section reading text reveal animation
          if (bottomSectionRef.current && readingTextRef.current) {
            const textElements = readingTextRef.current.querySelectorAll("[data-reading-text]");
            const ctaElement = readingTextRef.current.querySelector("[data-cta-card]");

            // Set initial state
            gsap.set(textElements, {
              opacity: 0.4,
              y: 30,
            });

            if (ctaElement) {
              gsap.set(ctaElement, {
                opacity: 0,
                y: 40,
              });
            }

            // Create scroll trigger for text reveal
            ScrollTrigger.create({
              trigger: bottomSectionRef.current,
              start: "top bottom",
              end: "bottom top",
              scrub: 1,
              onUpdate: (self) => {
                const progress = self.progress;

                // Animate text elements with smooth stagger
                textElements.forEach((el, index) => {
                  const staggerDelay = index * 0.15;
                  const adjustedProgress = Math.min(1, Math.max(0, progress - staggerDelay));

                  // Smooth reveal: start at 0.4 opacity, end at 1.0
                  const elOpacity = 0.4 + adjustedProgress * 0.6;
                  // Smooth translate: start at 30px, end at 0px
                  const elTranslateY = 30 - adjustedProgress * 30;

                  gsap.to(el, {
                    opacity: elOpacity,
                    y: elTranslateY,
                    duration: 0.1,
                    ease: "none",
                  });
                });

                // Animate CTA card - appears earlier and more visible
                if (ctaElement) {
                  const ctaStartProgress = 0.3; // Start appearing earlier
                  if (progress > ctaStartProgress) {
                    const ctaProgress = Math.min(
                      1,
                      (progress - ctaStartProgress) / (1 - ctaStartProgress)
                    );
                    // Ensure minimum opacity for visibility
                    const finalOpacity = Math.max(0.8, ctaProgress);

                    gsap.to(ctaElement, {
                      opacity: finalOpacity,
                      y: 40 - ctaProgress * 40,
                      duration: 0.1,
                      ease: "none",
                    });

                    // Add floating class when CTA is visible
                    if (ctaProgress > 0.5 && !ctaElement.classList.contains("is-floating")) {
                      ctaElement.classList.add("is-floating");
                    }
                  } else {
                    // Keep some visibility even when not fully scrolled
                    gsap.to(ctaElement, {
                      opacity: progress * 0.5, // Partial visibility
                      y: 40 - progress * 20,
                      duration: 0.1,
                      ease: "none",
                    });
                    ctaElement.classList.remove("is-floating");
                  }
                }
              },
            });

            // Floating animation for CTA card using CSS animation
            // This will be handled by CSS class, no GSAP needed to avoid conflicts

            // Fallback: Ensure CTA is visible after a delay if scroll trigger doesn't work
            if (ctaElement) {
              setTimeout(() => {
                const computedStyle = window.getComputedStyle(ctaElement);
                const currentOpacity = parseFloat(computedStyle.opacity);
                if (currentOpacity < 0.5) {
                  // If CTA is still not visible, make it visible
                  gsap.to(ctaElement, {
                    opacity: 0.9,
                    y: 0,
                    duration: 0.8,
                    ease: "power2.out",
                  });
                  ctaElement.classList.add("is-floating");
                }
              }, 2000);
            }
          }
        }, pageRef);

        return () => ctx.revert();
      };

      // Defer heavy animations until browser is idle
      if (typeof window !== "undefined" && "requestIdleCallback" in window) {
        requestIdleCallback(initAnimations, { timeout: 1000 });
      } else {
        // Fallback for browsers without requestIdleCallback
        setTimeout(initAnimations, 100);
      }
    },
    { scope: pageRef, dependencies: [isMounted, isVideoLoaded] }
  );

  return (
    <div
      ref={pageRef}
      className="min-h-screen bg-luxury-black text-white selection:bg-luxury-gold/20 selection:text-white"
    >
      {/* Full Screen Video Background - No Zoom, High Quality */}
      <div
        className="fixed inset-0 z-0 w-screen h-screen overflow-hidden"
        style={{
          willChange: "transform",
          backfaceVisibility: "hidden",
          WebkitBackfaceVisibility: "hidden",
          transform: "translateZ(0)",
          WebkitTransform: "translateZ(0)",
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-luxury-black via-luxury-black/95 to-luxury-black z-0" />

        <video
          ref={(video) => {
            // Store ref for GSAP ScrollTrigger
            videoRef.current = video;

            if (video) {
              // Optimal video autoplay handling - ensure video never pauses or breaks
              const forcePlay = async () => {
                try {
                  if (video.paused && !video.ended) {
                    await video.play();
                  }
                } catch (error) {
                  console.warn("[ProductsPage] Video autoplay prevented, retrying:", error);
                  setTimeout(() => {
                    video.play().catch(() => {
                      setTimeout(() => {
                        video.play().catch(() => {
                          console.warn(
                            "[ProductsPage] Video autoplay failed after multiple retries"
                          );
                        });
                      }, 500);
                    });
                  }, 100);
                }
              };

              const handleCanPlay = () => {
                setIsVideoLoaded(true);
                forcePlay();
              };
              const handleLoadedData = () => {
                setIsVideoLoaded(true);
                forcePlay();
              };
              const handleError = () => {
                setIsVideoLoaded(false);
                console.warn("[ProductsPage] Video error occurred");
              };
              const handlePause = () => {
                if (!video.ended) {
                  setTimeout(() => {
                    if (video.paused && !video.ended) {
                      forcePlay();
                    }
                  }, 50);
                }
              };
              const handleVisibilityChange = () => {
                if (!document.hidden && video.paused && !video.ended) {
                  forcePlay();
                }
              };
              const handleEnded = () => {
                video.currentTime = 0;
                forcePlay();
              };
              const handleWaiting = () => {
                if (video.paused && !video.ended) {
                  setTimeout(() => forcePlay(), 100);
                }
              };

              // Optimize video quality settings
              video.setAttribute("playsinline", "true");
              video.setAttribute("webkit-playsinline", "true");

              // Ensure high quality rendering
              if ("requestVideoFrameCallback" in video) {
                // Use modern API for better quality
                (video as any).requestVideoFrameCallback(() => {
                  // Force high quality rendering
                });
              }

              // Check if video is already loaded
              if (video.readyState >= 2) {
                setIsVideoLoaded(true);
              }

              forcePlay();
              video.addEventListener("canplay", handleCanPlay);
              video.addEventListener("loadeddata", handleLoadedData);
              video.addEventListener("error", handleError);
              video.addEventListener("pause", handlePause);
              video.addEventListener("ended", handleEnded);
              video.addEventListener("waiting", handleWaiting);
              document.addEventListener("visibilitychange", handleVisibilityChange);

              // Preload with high quality
              video.load();

              // Force hardware acceleration for crisp rendering
              video.style.transform = "translateZ(0)";
              video.style.webkitTransform = "translateZ(0)";

              const playCheckInterval = setInterval(() => {
                if (video.paused && !video.ended && !document.hidden) {
                  forcePlay();
                }
              }, 2000);

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
            } else {
              // Cleanup when video is unmounted
              if (videoRef.current && (videoRef.current as any).__cleanup) {
                (videoRef.current as any).__cleanup();
              }
              videoRef.current = null;
            }
          }}
          autoPlay
          loop
          muted
          playsInline
          preload="auto"
          className={`absolute inset-0 w-screen h-screen object-cover transition-opacity duration-1000 z-10 ${
            isVideoLoaded ? "opacity-100" : "opacity-0"
          }`}
          style={{
            objectFit: "cover",
            objectPosition: "center center",
            width: "100vw",
            height: "100vh",
            transform: "translateZ(0)",
            WebkitTransform: "translateZ(0)",
            willChange: "opacity, transform",
            backfaceVisibility: "hidden",
            WebkitBackfaceVisibility: "hidden",
            filter: "none",
            WebkitFilter: "none",
          }}
          disablePictureInPicture
          disableRemotePlayback
        >
          <source src={getR2UrlClient("/videos/hero/gold-stone.mp4")} type="video/mp4" />
        </video>

        {/* Optimized Vignette Layer - Stable, optimal, and consistent */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/50 to-black/80 z-20" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,rgba(0,0,0,0.5)_60%,rgba(0,0,0,0.85)_100%)] z-20" />
        <div className="absolute inset-x-0 top-0 h-32 md:h-40 lg:h-48 bg-gradient-to-b from-black/80 via-black/40 to-transparent pointer-events-none z-20" />
        <div className="absolute inset-x-0 bottom-0 h-48 md:h-56 lg:h-64 bg-gradient-to-t from-black/90 via-black/60 to-transparent pointer-events-none z-20" />
        <div className="absolute inset-y-0 left-0 w-32 md:w-40 lg:w-48 bg-gradient-to-r from-black/70 via-black/30 to-transparent pointer-events-none z-20" />
        <div className="absolute inset-y-0 right-0 w-32 md:w-40 lg:w-48 bg-gradient-to-l from-black/70 via-black/30 to-transparent pointer-events-none z-20" />

        {/* Fade to Black Overlay - Controlled by ScrollTrigger */}
        <div
          ref={fadeOverlayRef}
          className="absolute inset-0 bg-luxury-black pointer-events-none z-30"
          style={{ opacity: 0 }}
        />
      </div>

      <Navbar />

      {/* ENHANCED: Hero Section - Full Screen, matching What We Do exactly */}
      <section
        ref={(element) => {
          sectionsRef.current[0] = element;
        }}
        className="relative flex min-h-screen items-center justify-start overflow-hidden"
      >
        {/* Hero Content - Full left alignment, flush to left edge - Matching What We Do */}
        <div className="relative z-20 w-full text-left pl-4 sm:pl-6 md:pl-8 lg:pl-12 xl:pl-16 2xl:pl-20 pr-4 sm:pr-6 md:pr-8 lg:pr-12">
          <motion.div
            ref={heroRef}
            variants={revealVariants}
            initial="initial"
            animate="animate"
            className="space-y-6 sm:space-y-8 max-w-4xl"
          >
            <motion.h1
              className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-sans font-light leading-[1.1] tracking-tight text-white"
              data-hero
            >
              {t("hero.title")}
              <br />
              <span className="font-sans font-normal">{t("hero.titleBold")}</span>
            </motion.h1>
            <motion.p
              data-hero
              className="text-base sm:text-lg md:text-xl font-sans font-light leading-relaxed text-luxury-silver/90 max-w-2xl"
            >
              {t("hero.subtitle") ||
                "Discover our premium collection of certified precious metals, each bar crafted with precision and verified authenticity."}
            </motion.p>
          </motion.div>
        </div>

        {/* Scroll Indicator - Minimalist with GSAP Fluid Scroll Animation */}
        <div
          ref={scrollIndicatorRef}
          className="absolute bottom-8 left-1/2 -translate-x-1/2 z-30 flex flex-col items-center gap-3 pointer-events-none"
        >
          {/* Minimalist Mouse Icon */}
          <div
            data-mouse-icon
            className="relative w-5 h-8 border border-white/50 rounded-full flex items-start justify-center pt-2.5"
          >
            {/* Scroll wheel indicator - animated */}
            <div data-scroll-wheel className="w-1 h-1.5 bg-white/70 rounded-full" />
          </div>
        </div>
      </section>

      {/* Products Section - Minimalist Style */}
      <section
        id="products-section"
        ref={(element) => {
          sectionsRef.current[1] = element;
        }}
        className="relative overflow-hidden pt-16 pb-0"
      >
        {/* Products Catalog Section - Dark Background */}
        <div className="bg-gradient-to-b from-luxury-black via-[#1a1a1a] to-[#0f0f0f] px-0 md:px-0 lg:px-0 py-8 md:py-12">
          <div className="relative z-10 mx-auto max-w-[1400px] px-6 md:px-8 lg:px-12">
            {/* Filter Bar - Product Count and Navigation */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, ease: "easeOut" }}
              className="mb-12 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-6 border-b border-white/10"
            >
              <motion.div
                key={`count-${selectedFilter}-${selectedCategory}`}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.4, ease: "easeOut" }}
                className="text-xl md:text-sm text-white/70 font-extralight tracking-wide uppercase"
              >
                {(() => {
                  const filteredProducts = (() => {
                    let filtered = allProducts;

                    // Filter by category
                    if (selectedCategory) {
                      filtered = filtered.filter((p) => p.category === selectedCategory);
                    }

                    // Filter by type
                    if (selectedFilter === "award-winning") {
                      filtered = filtered.filter((p) => p.awards && p.awards.length > 0);
                    } else if (selectedFilter === "exclusives") {
                      // You can define what makes a product "exclusive"
                      filtered = filtered.filter((p) => p.awards?.includes("trophy"));
                    } else if (selectedFilter === "large") {
                      filtered = filtered.filter(
                        (p) =>
                          p.category === t("categories.250gram.title") ||
                          p.category === t("categories.100gram.title")
                      );
                    } else if (selectedFilter === "small") {
                      filtered = filtered.filter(
                        (p) =>
                          p.category === t("categories.10gram.title") ||
                          p.category === t("categories.5gram.title")
                      );
                    }

                    return filtered;
                  })();

                  return `${filteredProducts.length} PRODUCTS`;
                })()}
              </motion.div>

              {/* Navigation Tabs */}
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, ease: "easeOut", delay: 0.2 }}
                className="flex flex-wrap items-center gap-6 md:gap-8 justify-center"
              >
                <button
                  onClick={() => {
                    setSelectedFilter("all");
                    setSelectedCategory(null);
                  }}
                  className={`text-md md:text-sm font-extralight tracking-wide uppercase transition-colors pb-1 border-b ${
                    selectedFilter === "all" && !selectedCategory
                      ? "text-luxury-gold border-luxury-gold"
                      : "text-white/50 border-transparent hover:text-white/70 hover:border-white/30"
                  }`}
                >
                  {t("filters.all")}
                </button>
                <button
                  onClick={() => {
                    setSelectedFilter("award-winning");
                    setSelectedCategory(null);
                  }}
                  className={`text-md md:text-sm font-extralight tracking-wide uppercase transition-colors pb-1 border-b ${
                    selectedFilter === "award-winning"
                      ? "text-luxury-gold border-luxury-gold"
                      : "text-white/50 border-transparent hover:text-white/70 hover:border-white/30"
                  }`}
                >
                  {t("filters.awardWinning")}
                </button>
                <button
                  onClick={() => {
                    setSelectedFilter("exclusives");
                    setSelectedCategory(null);
                  }}
                  className={`text-md md:text-sm font-extralight tracking-wide uppercase transition-colors pb-1 border-b ${
                    selectedFilter === "exclusives"
                      ? "text-luxury-gold border-luxury-gold"
                      : "text-white/50 border-transparent hover:text-white/70 hover:border-white/30"
                  }`}
                >
                  {t("filters.exclusives")}
                </button>
                <button
                  onClick={() => {
                    setSelectedFilter("large");
                    setSelectedCategory(null);
                  }}
                  className={`text-md md:text-sm font-extralight tracking-wide uppercase transition-colors pb-1 border-b ${
                    selectedFilter === "large"
                      ? "text-luxury-gold border-luxury-gold"
                      : "text-white/50 border-transparent hover:text-white/70 hover:border-white/30"
                  }`}
                >
                  {t("filters.large")}
                </button>
                <button
                  onClick={() => {
                    setSelectedFilter("small");
                    setSelectedCategory(null);
                  }}
                  className={`text-md md:text-sm font-extralight tracking-wide uppercase transition-colors pb-1 border-b ${
                    selectedFilter === "small"
                      ? "text-luxury-gold border-luxury-gold"
                      : "text-white/50 border-transparent hover:text-white/70 hover:border-white/30"
                  }`}
                >
                  {t("filters.small")}
                </button>
              </motion.div>
            </motion.div>

            {/* Products Grid */}
            {(() => {
              const filteredProducts = (() => {
                let filtered = allProducts;

                // Filter by category
                if (selectedCategory) {
                  filtered = filtered.filter((p) => p.category === selectedCategory);
                }

                // Filter by type
                if (selectedFilter === "award-winning") {
                  filtered = filtered.filter((p) => p.awards && p.awards.length > 0);
                } else if (selectedFilter === "exclusives") {
                  filtered = filtered.filter((p) => p.awards?.includes("trophy"));
                } else if (selectedFilter === "large") {
                  filtered = filtered.filter(
                    (p) =>
                      p.category === t("categories.250gram.title") ||
                      p.category === t("categories.100gram.title")
                  );
                } else if (selectedFilter === "small") {
                  filtered = filtered.filter(
                    (p) =>
                      p.category === t("categories.10gram.title") ||
                      p.category === t("categories.5gram.title")
                  );
                }

                return filtered;
              })();

              if (filteredProducts.length === 0) {
                return (
                  <div className="text-center py-20">
                    <p className="text-white/50">{t("filters.noProducts")}</p>
                  </div>
                );
              }

              return (
                <AnimatePresence mode="wait">
                  <motion.div
                    key={`${selectedFilter}-${selectedCategory}`}
                    initial="initial"
                    animate="animate"
                    exit="exit"
                    variants={{
                      initial: { opacity: 0 },
                      animate: {
                        opacity: 1,
                        transition: {
                          staggerChildren: 0.03,
                          delayChildren: 0.1,
                        },
                      },
                      exit: {
                        opacity: 0,
                        transition: {
                          staggerChildren: 0.02,
                          staggerDirection: -1,
                        },
                      },
                    }}
                    className="flex flex-wrap justify-center gap-8 md:gap-10 lg:gap-12"
                  >
                    {filteredProducts.map((product, index) => (
                      <motion.div
                        key={product.id}
                        variants={cardVariants}
                        custom={index}
                        className="relative w-full sm:w-[calc(50%-1rem)] md:w-[calc(50%-1.5rem)] lg:w-[calc(33.333%-2rem)] xl:w-[280px]"
                      >
                        <ProductCard
                          product={product}
                          onProductSelect={handleProductSelect}
                          index={index}
                        />
                      </motion.div>
                    ))}
                  </motion.div>
                </AnimatePresence>
              );
            })()}
          </div>
        </div>
      </section>

      {/* Running Text Promotional Section */}
      <section className="relative bg-black py-3 md:py-6 overflow-hidden">
        <div className="relative">
          {/* Running Text Container */}
          <div className="flex overflow-hidden">
            <motion.div
              className="flex whitespace-nowrap"
              animate={{
                x: ["0%", "-100%"],
              }}
              transition={{
                x: {
                  repeat: Infinity,
                  repeatType: "loop",
                  duration: 80,
                  ease: "linear",
                },
              }}
            >
              {/* Content duplicated for seamless loop */}
              {[...Array(2)].map((_, idx) => (
                <div key={idx} className="flex items-center gap-8 md:gap-12 px-8 flex-shrink-0">
                  <span className="text-xs md:text-sm font-extralight tracking-[0.3em] uppercase text-white/30">
                    ✦
                  </span>
                  <span className="text-xs md:text-sm font-extralight tracking-[0.2em] uppercase text-white/40">
                    {t("runningText.premiumQuality")}
                  </span>
                  <span className="text-xs md:text-sm font-extralight tracking-[0.3em] uppercase text-white/30">
                    ✦
                  </span>
                  <span className="text-xs md:text-sm font-extralight tracking-[0.2em] uppercase text-white/40">
                    {t("runningText.certified")}
                  </span>
                  <span className="text-xs md:text-sm font-extralight tracking-[0.3em] uppercase text-white/30">
                    ✦
                  </span>
                  <span className="text-xs md:text-sm font-extralight tracking-[0.2em] uppercase text-white/40">
                    {t("runningText.secure")}
                  </span>
                  <span className="text-xs md:text-sm font-extralight tracking-[0.3em] uppercase text-white/30">
                    ✦
                  </span>
                  <span className="text-xs md:text-sm font-extralight tracking-[0.2em] uppercase text-white/40">
                    {t("runningText.trusted")}
                  </span>
                  <span className="text-xs md:text-sm font-extralight tracking-[0.3em] uppercase text-white/30">
                    ✦
                  </span>
                  <span className="text-xs md:text-sm font-extralight tracking-[0.2em] uppercase text-white/40">
                    {t("runningText.qrVerification")}
                  </span>
                  <span className="text-xs md:text-sm font-extralight tracking-[0.3em] uppercase text-white/30">
                    ✦
                  </span>
                </div>
              ))}
            </motion.div>
          </div>

          {/* Gradient Fade Edges */}
          <div className="absolute inset-y-0 left-0 w-32 bg-gradient-to-r from-black to-transparent pointer-events-none z-10" />
          <div className="absolute inset-y-0 right-0 w-32 bg-gradient-to-l from-black to-transparent pointer-events-none z-10" />
        </div>
      </section>

      {/* Bottom Section - Background Image with Reading Text */}
      <section
        ref={(element) => {
          sectionsRef.current[2] = element;
          bottomSectionRef.current = element as HTMLDivElement | null;
        }}
        className="relative min-h-[100vh] overflow-hidden"
        style={{
          backgroundImage: "url('/images/gold-ingot.jpg')",
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
          backgroundAttachment: "fixed",
        }}
      >
        {/* Overlay for better text readability */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/30 to-black/70 z-0" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_20%,rgba(0,0,0,0.5)_80%)] z-0" />

        {/* Reading Text Container - Scrolls normally */}
        <div
          ref={readingTextRef}
          className="relative z-20 flex min-h-[100vh] flex-col items-center justify-between px-8 md:px-12 lg:px-16"
          style={{
            paddingTop: "20vh",
            paddingBottom: "10vh",
          }}
        >
          {/* Top Content - Enhanced Typography & Motion */}
          <motion.div
            variants={bottomSectionVariants}
            initial="initial"
            whileInView="animate"
            viewport={{ once: true, amount: 0.3 }}
            className="mx-auto max-w-4xl text-center mb-10"
          >
            <div className="space-y-8 md:space-y-10">
              <motion.span
                variants={textRevealVariants}
                className="inline-block text-[0.7rem] md:text-sm font-extralight tracking-[0.3em] uppercase text-white/40 letter-spacing-wider"
              >
                {t("bottom.crafted")}
              </motion.span>

              <motion.h2
                variants={textRevealVariants}
                className="text-5xl md:text-4xl lg:text-4xl xl:text-4xl font-extralight leading-[1.15] tracking-[-0.03em] text-white px-4 md:px-6"
              >
                {t("bottom.preserved")}
                <br />
                <span className="font-light">{t("bottom.trusted")}</span>
              </motion.h2>
            </div>
          </motion.div>

          {/* Bottom Content - Enhanced Typography & Motion */}
          <motion.div
            variants={bottomSectionVariants}
            initial="initial"
            whileInView="animate"
            viewport={{ once: true, amount: 0.2 }}
            className="w-full flex flex-col items-center gap-10 md:gap-16"
          >
            {/* CTA Card - Enhanced Design with Motion */}
            <motion.div
              variants={ctaCardVariants}
              className="relative z-20 w-full max-w-lg cta-float "
            >
              <Link
                href="/authenticity"
                className="group block w-full p-8 md:p-10 border rounded-md border-white/20 bg-white/[0.04] backdrop-blur-lg transition-all duration-700 hover:border-white/35 hover:bg-white/[0.1] hover:shadow-[0_20px_60px_rgba(0,0,0,0.3)]"
              >
                <motion.div
                  className="flex flex-col items-center text-center gap-6"
                  whileHover={{ scale: 1.02 }}
                  transition={{ duration: 0.3 }}
                >
                  <motion.div
                    className="flex rounded-lg h-16 w-16 items-center justify-center border border-white/30 bg-white/8 group-hover:bg-white/15 transition-all duration-700"
                    whileHover={{ rotate: 5, scale: 1.1 }}
                    transition={{ type: "spring", stiffness: 300 }}
                  >
                    <QrCode className="h-10 w-10 text-white/75 group-hover:text-white transition-colors duration-700" />
                  </motion.div>
                  <div className="space-y-2.5">
                    <p className="text-[0.7rem] uppercase tracking-[0.25em] text-white/45 font-extralight letter-spacing-wider">
                      {t("bottom.scanVerify")}
                    </p>
                    <p className="text-lg md:text-lg font-extralight text-white/95 tracking-[-0.01em] leading-relaxed">
                      {t("bottom.tapToLaunch")}
                    </p>
                    <p className="text-xs md:text-xs text-white/35 font-extralight leading-relaxed max-w-md mx-auto tracking-wide">
                      {t("bottom.captureQR")}
                    </p>
                  </div>
                </motion.div>
              </Link>
            </motion.div>

            {/* Footer - Enhanced Typography */}
            <motion.footer
              variants={textRevealVariants}
              className="relative z-10 w-full border-t border-white/10 pt-15 pb-2"
            >
              <div className="mx-auto max-w-[900px] text-center mt-9">
                <p className="text-[0.7rem] md:text-xs font-extralight text-white/25 tracking-[0.1em] uppercase">
                  © {new Date().getFullYear()} {APP_NAME}. All rights reserved.
                </p>
              </div>
            </motion.footer>
          </motion.div>
        </div>
      </section>

      {/* Product Detail Modal */}
      <ProductModal product={selectedProduct} isOpen={isModalOpen} onClose={handleCloseModal} />
    </div>
  );
}
