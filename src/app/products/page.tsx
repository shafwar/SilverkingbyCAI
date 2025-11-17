"use client";

import Navbar from "@/components/layout/Navbar";
import { motion, type Variants } from "framer-motion";
import Link from "next/link";
import { Sparkles, Gem, ArrowRight, Shield, ArrowDown, QrCode } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { APP_NAME } from "@/utils/constants";
import { useRef, useState, useEffect } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import ProductModal, { type Product } from "@/components/ui/ProductModal";

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
};

type ProductCategory = {
  icon: LucideIcon;
  title: string;
  description: string;
  gradient: string;
  products: Product[];
};

const productCategories: ProductCategory[] = [
  {
    icon: Gem,
    title: "250 Gram",
    description:
      "Premium precious metal bar with 99.99% purity. Large size perfect for serious investors and long-term portfolio building.",
    gradient: "from-luxury-gold to-luxury-lightGold",
    products: [
      {
        id: "250gr-1",
        name: "Precious Metal Bar 250gr",
        image: "/images/silverking-gold.jpeg",
        purity: "99.99%",
        weight: "250gr",
        description:
          "Premium 250 gram precious metal bar with the highest purity, authentication certificate, and QR code verification. SKU: SKA000001",
        category: "250 Gram",
      },
      {
        id: "250gr-2",
        name: "Precious Metal Bar 250gr",
        image: "/images/silverking-gold.jpeg",
        purity: "99.99%",
        weight: "250gr",
        description: "Premium 250 gram precious metal bar with certification. SKU: SKA000002",
        category: "250 Gram",
      },
      {
        id: "250gr-3",
        name: "Precious Metal Bar 250gr",
        image: "/images/silverking-gold.jpeg",
        purity: "99.99%",
        weight: "250gr",
        description: "Premium 250 gram precious metal bar with certification. SKU: SKA000003",
        category: "250 Gram",
      },
    ],
  },
  {
    icon: Gem,
    title: "100 Gram",
    description:
      "Premium precious metal bar with 99.99% purity. Ideal size for balanced investment portfolios and collection purposes.",
    gradient: "from-luxury-gold via-luxury-lightGold to-luxury-gold",
    products: [
      {
        id: "100gr-1",
        name: "Precious Metal Bar 100gr",
        image: "/images/silverking-gold.jpeg",
        purity: "99.99%",
        weight: "100gr",
        description:
          "Premium 100 gram precious metal bar with the highest purity, authentication certificate, and QR code verification. SKU: SKP000001",
        category: "100 Gram",
      },
      {
        id: "100gr-2",
        name: "Precious Metal Bar 100gr",
        image: "/images/silverking-gold.jpeg",
        purity: "99.99%",
        weight: "100gr",
        description: "Premium 100 gram precious metal bar with certification. SKU: SKP000002",
        category: "100 Gram",
      },
      {
        id: "100gr-3",
        name: "Precious Metal Bar 100gr",
        image: "/images/silverking-gold.jpeg",
        purity: "99.99%",
        weight: "100gr",
        description: "Premium 100 gram precious metal bar with certification. SKU: SKP000003",
        category: "100 Gram",
      },
    ],
  },
  {
    icon: Gem,
    title: "50 Gram",
    description:
      "Premium precious metal bar with 99.99% purity. Versatile size suitable for both investment and gifting purposes.",
    gradient: "from-luxury-gold to-luxury-silver",
    products: [
      {
        id: "50gr-1",
        name: "Precious Metal Bar 50gr",
        image: "/images/silverking-gold.jpeg",
        purity: "99.99%",
        weight: "50gr",
        description:
          "Premium 50 gram precious metal bar with the highest purity, authentication certificate, and QR code verification. SKU: SKN000001",
        category: "50 Gram",
      },
      {
        id: "50gr-2",
        name: "Precious Metal Bar 50gr",
        image: "/images/silverking-gold.jpeg",
        purity: "99.99%",
        weight: "50gr",
        description: "Premium 50 gram precious metal bar with certification. SKU: SKN000002",
        category: "50 Gram",
      },
      {
        id: "50gr-3",
        name: "Precious Metal Bar 50gr",
        image: "/images/silverking-gold.jpeg",
        purity: "99.99%",
        weight: "50gr",
        description: "Premium 50 gram precious metal bar with certification. SKU: SKN000003",
        category: "50 Gram",
      },
    ],
  },
  {
    icon: Gem,
    title: "25 Gram",
    description:
      "Premium precious metal bar with 99.99% purity. Compact size perfect for starting your precious metal investment journey.",
    gradient: "from-luxury-silver to-luxury-lightSilver",
    products: [
      {
        id: "25gr-1",
        name: "Precious Metal Bar 25gr",
        image: "/images/silverking-gold.jpeg",
        purity: "99.99%",
        weight: "25gr",
        description:
          "Premium 25 gram precious metal bar with the highest purity, authentication certificate, and QR code verification. SKU: SKC000001",
        category: "25 Gram",
      },
      {
        id: "25gr-2",
        name: "Precious Metal Bar 25gr",
        image: "/images/silverking-gold.jpeg",
        purity: "99.99%",
        weight: "25gr",
        description: "Premium 25 gram precious metal bar with certification. SKU: SKC000002",
        category: "25 Gram",
      },
      {
        id: "25gr-3",
        name: "Precious Metal Bar 25gr",
        image: "/images/silverking-gold.jpeg",
        purity: "99.99%",
        weight: "25gr",
        description: "Premium 25 gram precious metal bar with certification. SKU: SKC000003",
        category: "25 Gram",
      },
    ],
  },
  {
    icon: Gem,
    title: "10 Gram",
    description:
      "Premium precious metal bar with 99.99% purity. Entry-level size ideal for new investors and collectors.",
    gradient: "from-luxury-lightSilver to-luxury-silver",
    products: [
      {
        id: "10gr-1",
        name: "Precious Metal Bar 10gr",
        image: "/images/silverking-gold.jpeg",
        purity: "99.99%",
        weight: "10gr",
        description:
          "Premium 10 gram precious metal bar with the highest purity, authentication certificate, and QR code verification. SKU: SKI000001",
        category: "10 Gram",
      },
      {
        id: "10gr-2",
        name: "Precious Metal Bar 10gr",
        image: "/images/silverking-gold.jpeg",
        purity: "99.99%",
        weight: "10gr",
        description: "Premium 10 gram precious metal bar with certification. SKU: SKI000002",
        category: "10 Gram",
      },
      {
        id: "10gr-3",
        name: "Precious Metal Bar 10gr",
        image: "/images/silverking-gold.jpeg",
        purity: "99.99%",
        weight: "10gr",
        description: "Premium 10 gram precious metal bar with certification. SKU: SKI000003",
        category: "10 Gram",
      },
    ],
  },
  {
    icon: Gem,
    title: "5 Gram",
    description:
      "Premium precious metal bar with 99.99% purity. Smallest size perfect for gifts and starter collections.",
    gradient: "from-luxury-silver via-luxury-gold to-luxury-lightSilver",
    products: [
      {
        id: "5gr-1",
        name: "Precious Metal Bar 5gr",
        image: "/images/silverking-gold.jpeg",
        purity: "99.99%",
        weight: "5gr",
        description:
          "Premium 5 gram precious metal bar with the highest purity, authentication certificate, and QR code verification. SKU: SKT000001",
        category: "5 Gram",
      },
      {
        id: "5gr-2",
        name: "Precious Metal Bar 5gr",
        image: "/images/silverking-gold.jpeg",
        purity: "99.99%",
        weight: "5gr",
        description: "Premium 5 gram precious metal bar with certification. SKU: SKT000002",
        category: "5 Gram",
      },
      {
        id: "5gr-3",
        name: "Precious Metal Bar 5gr",
        image: "/images/silverking-gold.jpeg",
        purity: "99.99%",
        weight: "5gr",
        description: "Premium 5 gram precious metal bar with certification. SKU: SKT000003",
        category: "5 Gram",
      },
    ],
  },
];

// Product Category Grid Item with Hover Slideshow
const CategoryGridItem = ({
  category,
  index,
  onProductSelect,
}: {
  category: ProductCategory;
  index: number;
  onProductSelect: (product: Product) => void;
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
              Hover to view products
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default function ProductsPage() {
  const pageRef = useRef<HTMLDivElement | null>(null);
  const heroRef = useRef<HTMLDivElement | null>(null);
  const sectionsRef = useRef<(HTMLElement | null)[]>([]);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const fadeOverlayRef = useRef<HTMLDivElement | null>(null);
  const bottomSectionRef = useRef<HTMLDivElement | null>(null);
  const readingTextRef = useRef<HTMLDivElement | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isVideoLoaded, setIsVideoLoaded] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const handleProductSelect = (product: Product) => {
    setSelectedProduct(product);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setTimeout(() => setSelectedProduct(null), 300);
  };

  // Handle video load - more robust loading
  useEffect(() => {
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
    };

    // Check if video is already loaded
    if (video.readyState >= 2) {
      setIsVideoLoaded(true);
    }

    video.addEventListener("canplay", handleCanPlay);
    video.addEventListener("loadeddata", handleLoadedData);
    video.addEventListener("error", handleError);

    // Force load
    video.load();

    return () => {
      video.removeEventListener("canplay", handleCanPlay);
      video.removeEventListener("loadeddata", handleLoadedData);
      video.removeEventListener("error", handleError);
    };
  }, []);

  useGSAP(
    () => {
      if (!pageRef.current) return;

      const ctx = gsap.context(() => {
        // Video zoom in animation
        if (videoRef.current && isVideoLoaded) {
          gsap.fromTo(
            videoRef.current,
            { scale: 1 },
            {
              scale: 1.1,
              duration: 20,
              ease: "none",
              repeat: -1,
              yoyo: true,
            }
          );
        }

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
    },
    { scope: pageRef, dependencies: [isVideoLoaded] }
  );

  return (
    <div
      ref={pageRef}
      className="min-h-screen bg-luxury-black text-white selection:bg-luxury-gold/20 selection:text-white"
    >
      {/* Video Background with Zoom In Effect */}
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <div className="absolute inset-0">
          {/* Fallback gradient background - always visible */}
          <div className="absolute inset-0 bg-gradient-to-br from-luxury-black via-luxury-black/95 to-luxury-black z-0" />

          <video
            ref={videoRef}
            autoPlay
            loop
            muted
            playsInline
            preload="auto"
            className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-1000 will-change-transform z-10 ${
              isVideoLoaded ? "opacity-100" : "opacity-0"
            }`}
            style={{
              transform: "scale(1.05)",
              transformOrigin: "center center",
            }}
            onError={() => {
              setIsVideoLoaded(false);
            }}
            onCanPlay={() => {
              setIsVideoLoaded(true);
            }}
            onLoadedData={() => {
              setIsVideoLoaded(true);
            }}
          >
            <source src="/videos/hero/gold-stone.mp4" type="video/mp4" />
          </video>

          {/* Dark overlay for better text readability */}
          <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/40 to-black/60 z-20" />

          {/* Vignette Effect */}
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,rgba(10,10,10,0.6)_100%)] z-20" />

          {/* Soft Fading at Bottom - Enhanced for better transition */}
          <div className="absolute inset-x-0 bottom-0 h-[40vh] bg-gradient-to-t from-luxury-black via-luxury-black/60 to-transparent pointer-events-none z-20" />
          <div className="absolute inset-x-0 bottom-0 h-64 bg-gradient-to-t from-luxury-black/90 to-transparent pointer-events-none z-20" />

          {/* Fade to Black Overlay - Controlled by ScrollTrigger */}
          <div
            ref={fadeOverlayRef}
            className="absolute inset-0 bg-luxury-black pointer-events-none z-30"
            style={{ opacity: 0 }}
          />
        </div>
      </div>

      <Navbar />

      {/* Hero Section - Minimalist Design like pixelmatters */}
      <section
        ref={(element) => {
          sectionsRef.current[0] = element;
        }}
        className="relative px-6 md:px-8 lg:px-12 pt-32 pb-24 md:pt-40 md:pb-32 lg:pt-48 lg:pb-40 min-h-[60vh] md:min-h-[70vh] lg:min-h-[80vh] flex items-center"
      >
        <div className="relative z-10 w-full max-w-[1400px] mx-auto">
          <motion.div
            ref={heroRef}
            variants={revealVariants}
            initial="initial"
            animate="animate"
            className="text-left max-w-4xl"
          >
            {/* Main Heading - Minimalist Typography like pixelmatters */}
            <motion.h1
              className="text-[1.5rem] md:text-[3.5rem] lg:text-[2.5rem] xl:text-[3.5rem] 2xl:text-[4rem] font-light leading-[1.15] tracking-[-0.02em] md:tracking-[-0.03em] text-white"
              data-hero
            >
              More than a decade crafting
              <br />
              <span className="font-normal">future-proof precious metals.</span>
            </motion.h1>
          </motion.div>
        </div>
      </section>

      {/* CTA Section - Scroll to Browse */}
      <section className="relative px-6 md:px-8 lg:px-12 py-16 md:py-20">
        <div className="relative z-10 mx-auto max-w-[1400px]">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="text-center"
          >
            <motion.button
              onClick={() => {
                const productsSection = document.getElementById("products-section");
                productsSection?.scrollIntoView({ behavior: "smooth", block: "start" });
              }}
              className="group inline-flex flex-col items-center gap-2 text-white/60 hover:text-white transition-all duration-300"
              animate={{
                y: [0, -8, 0],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            >
              <span className="text-sm md:text-base font-light tracking-wide">
                Explore our collection
              </span>
              <ArrowDown className="h-4 w-4 md:h-5 md:w-5 transition-transform duration-300 group-hover:translate-y-1" />
            </motion.button>
          </motion.div>
        </div>
      </section>

      {/* Product Categories Grid - 3 Columns - FIXED ALIGNMENT */}
      <section
        id="products-section"
        ref={(element) => {
          sectionsRef.current[1] = element;
        }}
        className="relative overflow-hidden pt-8 pb-12 md:pt-12 md:pb-20 lg:pt-16 px-6"
      >
        <div className="relative z-10 mx-auto max-w-[1400px]">
          {/* Filter Section - Minimalist */}
          <div className="mb-8 md:mb-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <h2 className="text-2xl md:text-3xl font-light text-white">Our Products</h2>
            <div className="flex flex-wrap gap-2 md:gap-3">
              <button
                onClick={() => setSelectedCategory(null)}
                className={`px-4 py-2 text-sm font-light rounded-full border transition-all duration-300 ${
                  selectedCategory === null
                    ? "border-white/30 bg-white/5 text-white"
                    : "border-white/10 text-white/60 hover:border-white/20 hover:text-white/80"
                }`}
              >
                All
              </button>
              {productCategories.map((category) => (
                <button
                  key={category.title}
                  onClick={() => setSelectedCategory(category.title)}
                  className={`px-4 py-2 text-sm font-light rounded-full border transition-all duration-300 ${
                    selectedCategory === category.title
                      ? "border-white/30 bg-white/5 text-white"
                      : "border-white/10 text-white/60 hover:border-white/20 hover:text-white/80"
                  }`}
                >
                  {category.title}
                </button>
              ))}
            </div>
          </div>

          {/* Filtered Categories */}
          {(() => {
            const filteredCategories = selectedCategory
              ? productCategories.filter((cat) => cat.title === selectedCategory)
              : productCategories;

            if (filteredCategories.length === 0) {
              return (
                <div className="text-center py-20">
                  <p className="text-white/60">No products found in this category.</p>
                </div>
              );
            }

            return (
              <>
                {/* Top 3 Items - Horizontal Scroll on Mobile */}
                <div className="md:hidden mb-12">
                  <div className="flex gap-6 overflow-x-auto pb-4 -mx-6 px-6 scrollbar-hide snap-x snap-mandatory scroll-smooth">
                    {filteredCategories.slice(0, 3).map((category, index) => (
                      <div
                        key={category.title}
                        className="flex-shrink-0 w-[85vw] max-w-[380px] snap-center"
                      >
                        <CategoryGridItem
                          category={category}
                          index={index}
                          onProductSelect={handleProductSelect}
                        />
                      </div>
                    ))}
                  </div>
                </div>

                {/* All Items - Grid Layout (Desktop) */}
                <div className="hidden md:grid md:grid-cols-2 lg:grid-cols-3 gap-0 items-stretch overflow-hidden rounded-2xl border border-white/5">
                  {filteredCategories.map((category, index) => {
                    const totalItems = filteredCategories.length;
                    const colsLg = 3;
                    const colsMd = 2;

                    // Calculate position for lg (3 cols)
                    const rowLg = Math.floor(index / colsLg);
                    const colLg = index % colsLg;
                    const lastRowLg = Math.floor((totalItems - 1) / colsLg);

                    // Calculate position for md (2 cols)
                    const rowMd = Math.floor(index / colsMd);
                    const colMd = index % colsMd;
                    const lastRowMd = Math.floor((totalItems - 1) / colsMd);

                    // Determine rounded corners
                    const roundedClasses = [];

                    // Top-left corner
                    if ((rowLg === 0 && colLg === 0) || (rowMd === 0 && colMd === 0)) {
                      roundedClasses.push("md:rounded-tl-2xl lg:rounded-tl-2xl");
                    }

                    // Top-right corner
                    if (
                      (rowLg === 0 && colLg === colsLg - 1) ||
                      (rowMd === 0 && colMd === colsMd - 1)
                    ) {
                      roundedClasses.push("md:rounded-tr-2xl lg:rounded-tr-2xl");
                    }

                    // Bottom-left corner
                    if (
                      (rowLg === lastRowLg && colLg === 0) ||
                      (rowMd === lastRowMd && colMd === 0)
                    ) {
                      roundedClasses.push("md:rounded-bl-2xl lg:rounded-bl-2xl");
                    }

                    // Bottom-right corner
                    if (
                      (rowLg === lastRowLg && colLg === colsLg - 1) ||
                      (rowMd === lastRowMd && colMd === colsMd - 1)
                    ) {
                      roundedClasses.push("md:rounded-br-2xl lg:rounded-br-2xl");
                    }

                    return (
                      <div key={category.title} className={roundedClasses.join(" ")}>
                        <CategoryGridItem
                          category={category}
                          index={index}
                          onProductSelect={handleProductSelect}
                        />
                      </div>
                    );
                  })}
                </div>

                {/* Remaining Items - Grid Layout (Mobile) */}
                <div className="md:hidden grid grid-cols-1 gap-12">
                  {filteredCategories.slice(3).map((category, index) => (
                    <CategoryGridItem
                      key={category.title}
                      category={category}
                      index={index + 3}
                      onProductSelect={handleProductSelect}
                    />
                  ))}
                </div>
              </>
            );
          })()}
        </div>
      </section>

      {/* Bottom Section - Fixed Background with Clip-Inset & Reading Text Reveal */}
      <section
        ref={(element) => {
          sectionsRef.current[2] = element;
          bottomSectionRef.current = element as HTMLDivElement | null;
        }}
        className="clip-inset relative min-h-[100vh] overflow-hidden"
      >
        {/* Fixed Background Image Container - Stays fixed while scrolling */}
        <div className="image-background-fixed">
          <img
            src="/images/gold-ingot.jpg"
            alt=""
            className="h-full w-full object-cover"
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              objectPosition: "center",
            }}
            loading="lazy"
          />
          {/* Subtle overlay for better text readability */}
          <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/40 to-black/80" />
        </div>

        {/* Reading Text Container - Scrolls normally */}
        <div
          ref={readingTextRef}
          className="relative z-10 flex min-h-[100vh] flex-col items-center justify-between px-6 md:px-8 lg:px-12"
          style={{
            paddingTop: "18vh",
            paddingBottom: "6vh",
          }}
        >
          {/* Top Content */}
          <div className="mx-auto max-w-2xl text-center mt-auto">
            <div className="prose prose-justify-center max-w-md mx-auto">
              {/* Badge/Subheading */}
              <span
                data-reading-text
                className="mb-8 inline-block text-xs font-light tracking-[0.2em] uppercase text-white/60"
                style={{ opacity: 0.4, transform: "translateY(30px)" }}
              >
                Crafted with precision
              </span>

              {/* Main Heading */}
              <h2
                data-reading-text
                className="text-3xl md:text-4xl lg:text-5xl xl:text-6xl font-light leading-[1.2] tracking-[-0.02em] text-white"
                style={{ opacity: 0.4, transform: "translateY(30px)" }}
              >
                Preserved in gold,
                <br />
                <span className="font-normal">trusted for generations.</span>
              </h2>
            </div>
          </div>

          {/* Bottom Content - CTA and Footer */}
          <div className="w-full flex flex-col items-center gap-6 mb-auto ">
            {/* CTA Card - Scan & Verify - Minimalist & Clear */}
            <div
              data-cta-card
              className="relative z-20 w-full max-w-[min(360px,calc(100vw-30px))] cta-float"
              style={{ opacity: 0.3, transform: "translateY(20px)" }}
            >
              <Link
                href="/authenticity"
                className="group inline-flex items-center gap-3 text-left w-full p-4 rounded-xl border border-white/30 bg-black/80 backdrop-blur-md transition-all duration-300 hover:border-luxury-gold/60 hover:bg-black/90"
              >
                <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg border border-white/30 bg-white/10 group-hover:border-luxury-gold/50 group-hover:bg-luxury-gold/10 transition-all duration-300">
                  <QrCode className="h-5 w-5 text-white group-hover:text-luxury-gold transition-colors duration-300" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[0.65rem] uppercase tracking-[0.2em] text-white/60 mb-1 font-medium">
                    Scan & Verify
                  </p>
                  <p className="text-sm font-semibold text-white tracking-tight mb-1 group-hover:text-luxury-gold transition-colors duration-300">
                    Tap to launch Silver King QR scanner
                  </p>
                  <p className="text-xs text-white/60 leading-relaxed">
                    Capture the QR seal to view purity & provenance. "Product authenticated" badge
                    appears once functionality is live.
                  </p>
                </div>
              </Link>
            </div>

            {/* Footer - Inside clipped section */}
            <footer className="relative z-10 w-full border-t border-white/10 pt-6 pb-2">
              <div className="mx-auto max-w-[900px] text-center">
                <motion.p
                  className="text-xs font-light text-white/40"
                  initial={{ opacity: 0 }}
                  whileInView={{ opacity: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6 }}
                >
                  © {new Date().getFullYear()} {APP_NAME}. All rights reserved.
                </motion.p>
              </div>
            </footer>
          </div>
        </div>
      </section>

      {/* Product Detail Modal */}
      <ProductModal product={selectedProduct} isOpen={isModalOpen} onClose={handleCloseModal} />
    </div>
  );
}
