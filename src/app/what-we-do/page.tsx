"use client";

import Navbar from "@/components/layout/Navbar";
import { motion, type Variants } from "framer-motion";
import Link from "next/link";
import { Sparkles, Gem, Coins, ArrowRight, Shield } from "lucide-react";
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
        image: "/images/products/precious-metal-250gr.jpg",
        purity: "99.99%",
        weight: "250gr",
        description:
          "Premium 250 gram precious metal bar with the highest purity, authentication certificate, and QR code verification. SKU: SKA000001",
        category: "250 Gram",
      },
      {
        id: "250gr-2",
        name: "Precious Metal Bar 250gr",
        image: "/images/products/precious-metal-250gr.jpg",
        purity: "99.99%",
        weight: "250gr",
        description: "Premium 250 gram precious metal bar with certification. SKU: SKA000002",
        category: "250 Gram",
      },
      {
        id: "250gr-3",
        name: "Precious Metal Bar 250gr",
        image: "/images/products/precious-metal-250gr.jpg",
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
        image: "/images/products/precious-metal-100gr.jpg",
        purity: "99.99%",
        weight: "100gr",
        description:
          "Premium 100 gram precious metal bar with the highest purity, authentication certificate, and QR code verification. SKU: SKP000001",
        category: "100 Gram",
      },
      {
        id: "100gr-2",
        name: "Precious Metal Bar 100gr",
        image: "/images/products/precious-metal-100gr.jpg",
        purity: "99.99%",
        weight: "100gr",
        description: "Premium 100 gram precious metal bar with certification. SKU: SKP000002",
        category: "100 Gram",
      },
      {
        id: "100gr-3",
        name: "Precious Metal Bar 100gr",
        image: "/images/products/precious-metal-100gr.jpg",
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
        image: "/images/products/precious-metal-50gr.jpg",
        purity: "99.99%",
        weight: "50gr",
        description:
          "Premium 50 gram precious metal bar with the highest purity, authentication certificate, and QR code verification. SKU: SKN000001",
        category: "50 Gram",
      },
      {
        id: "50gr-2",
        name: "Precious Metal Bar 50gr",
        image: "/images/products/precious-metal-50gr.jpg",
        purity: "99.99%",
        weight: "50gr",
        description: "Premium 50 gram precious metal bar with certification. SKU: SKN000002",
        category: "50 Gram",
      },
      {
        id: "50gr-3",
        name: "Precious Metal Bar 50gr",
        image: "/images/products/precious-metal-50gr.jpg",
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
        image: "/images/products/precious-metal-25gr.jpg",
        purity: "99.99%",
        weight: "25gr",
        description:
          "Premium 25 gram precious metal bar with the highest purity, authentication certificate, and QR code verification. SKU: SKC000001",
        category: "25 Gram",
      },
      {
        id: "25gr-2",
        name: "Precious Metal Bar 25gr",
        image: "/images/products/precious-metal-25gr.jpg",
        purity: "99.99%",
        weight: "25gr",
        description: "Premium 25 gram precious metal bar with certification. SKU: SKC000002",
        category: "25 Gram",
      },
      {
        id: "25gr-3",
        name: "Precious Metal Bar 25gr",
        image: "/images/products/precious-metal-25gr.jpg",
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
        image: "/images/products/precious-metal-10gr.jpg",
        purity: "99.99%",
        weight: "10gr",
        description:
          "Premium 10 gram precious metal bar with the highest purity, authentication certificate, and QR code verification. SKU: SKI000001",
        category: "10 Gram",
      },
      {
        id: "10gr-2",
        name: "Precious Metal Bar 10gr",
        image: "/images/products/precious-metal-10gr.jpg",
        purity: "99.99%",
        weight: "10gr",
        description: "Premium 10 gram precious metal bar with certification. SKU: SKI000002",
        category: "10 Gram",
      },
      {
        id: "10gr-3",
        name: "Precious Metal Bar 10gr",
        image: "/images/products/precious-metal-10gr.jpg",
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
        image: "/images/products/precious-metal-5gr.jpg",
        purity: "99.99%",
        weight: "5gr",
        description:
          "Premium 5 gram precious metal bar with the highest purity, authentication certificate, and QR code verification. SKU: SKT000001",
        category: "5 Gram",
      },
      {
        id: "5gr-2",
        name: "Precious Metal Bar 5gr",
        image: "/images/products/precious-metal-5gr.jpg",
        purity: "99.99%",
        weight: "5gr",
        description: "Premium 5 gram precious metal bar with certification. SKU: SKT000002",
        category: "5 Gram",
      },
      {
        id: "5gr-3",
        name: "Precious Metal Bar 5gr",
        image: "/images/products/precious-metal-5gr.jpg",
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
      className="group relative flex flex-col"
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
      <div className="relative aspect-[4/3] overflow-hidden rounded-lg bg-gradient-to-br from-luxury-black/80 to-luxury-black border border-white/5 transition-all duration-500 group-hover:border-white/20">
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

export default function WhatWeDoPage() {
  const pageRef = useRef<HTMLDivElement | null>(null);
  const heroRef = useRef<HTMLDivElement | null>(null);
  const sectionsRef = useRef<(HTMLElement | null)[]>([]);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const fadeOverlayRef = useRef<HTMLDivElement | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [isVideoLoaded, setIsVideoLoaded] = useState(false);

  const handleProductSelect = (product: Product) => {
    setSelectedProduct(product);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setTimeout(() => setSelectedProduct(null), 300);
  };

  // Track mouse position for parallax
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({
        x: (e.clientX / window.innerWidth - 0.5) * 20,
        y: (e.clientY / window.innerHeight - 0.5) * 20,
      });
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  // Handle video load
  useEffect(() => {
    if (videoRef.current) {
      const handleLoadedData = () => {
        setIsVideoLoaded(true);
      };
      videoRef.current.addEventListener("loadeddata", handleLoadedData);
      return () => {
        if (videoRef.current) {
          videoRef.current.removeEventListener("loadeddata", handleLoadedData);
        }
      };
    }
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
          <video
            ref={videoRef}
            autoPlay
            loop
            muted
            playsInline
            preload="metadata"
            className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-1000 will-change-transform ${
              isVideoLoaded ? "opacity-100" : "opacity-0"
            }`}
            style={{
              transform: "scale(1.05)",
              transformOrigin: "center center",
            }}
          >
            <source src="/videos/hero/gold-stone.mp4" type="video/mp4" />
          </video>

          {/* Fallback gradient background while video loads */}
          {!isVideoLoaded && (
            <div className="absolute inset-0 bg-gradient-to-br from-luxury-black via-luxury-black/95 to-luxury-black" />
          )}

          {/* Dark overlay for better text readability */}
          <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/40 to-black/60" />

          {/* Vignette Effect */}
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,rgba(10,10,10,0.6)_100%)]" />

          {/* Soft Fading at Bottom - Enhanced for better transition */}
          <div className="absolute inset-x-0 bottom-0 h-[40vh] bg-gradient-to-t from-luxury-black via-luxury-black/60 to-transparent pointer-events-none" />
          <div className="absolute inset-x-0 bottom-0 h-64 bg-gradient-to-t from-luxury-black/90 to-transparent pointer-events-none" />

          {/* Fade to Black Overlay - Controlled by ScrollTrigger */}
          <div
            ref={fadeOverlayRef}
            className="absolute inset-0 bg-luxury-black pointer-events-none"
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
        className="relative px-6 pt-32 pb-16 md:pt-40 md:pb-24"
      >
        <div className="relative z-10 mx-auto w-full max-w-[1400px]">
          <motion.div
            ref={heroRef}
            variants={revealVariants}
            initial="initial"
            animate="animate"
            className="text-left"
          >
            {/* Main Heading - Minimalist Typography */}
            <motion.h1
              className="text-[3rem] font-light leading-[1.1] tracking-[-0.03em] text-white md:text-[1.5rem] lg:text-[4rem] xl:text-[5rem]"
              data-hero
            >
              More than a decade crafting
              <br />
              <span className="font-normal">future-proof precious metals.</span>
            </motion.h1>
          </motion.div>
        </div>
      </section>

      {/* Product Categories Grid - 3 Columns - FIXED ALIGNMENT */}
      <section
        ref={(element) => {
          sectionsRef.current[1] = element;
        }}
        className="relative overflow-hidden py-12 md:py-20 px-6"
      >
        <div className="relative z-10 mx-auto max-w-[1400px]">
          <div className="grid grid-cols-1 gap-12 md:grid-cols-2 lg:grid-cols-3 md:gap-8 lg:gap-12 items-start">
            {productCategories.map((category, index) => (
              <CategoryGridItem
                key={category.title}
                category={category}
                index={index}
                onProductSelect={handleProductSelect}
              />
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section - Minimalist Modern */}
      <section
        ref={(element) => {
          sectionsRef.current[2] = element;
        }}
        className="relative py-32 md:py-40 px-6"
      >
        <div className="relative z-10 mx-auto max-w-[900px] text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            data-reveal
          >
            <h2 className="mb-8 text-4xl font-light leading-[1.1] tracking-tight text-white md:text-5xl lg:text-6xl">
              <span>Ready to start</span>
              <br />
              <span className="font-normal bg-gradient-to-r from-luxury-gold via-luxury-lightGold to-luxury-gold bg-clip-text text-transparent">
                investing in precious metals?
              </span>
            </h2>
            <p className="mx-auto mb-12 max-w-xl text-base font-light leading-relaxed text-white/60 md:text-lg">
              Join thousands of investors who trust {APP_NAME} for authentic and verified precious
              metals.
            </p>

            <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Link
                href="/verify"
                className="group relative inline-flex items-center justify-center gap-2 rounded-full bg-luxury-gold px-8 py-3.5 text-sm font-medium text-black transition-all duration-300 hover:bg-luxury-lightGold hover:shadow-[0_20px_50px_-15px_rgba(212,175,55,0.5)]"
              >
                <Shield className="h-4 w-4" />
                <span>Verify Product</span>
                <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
              </Link>

              <Link
                href="/contact"
                className="inline-flex items-center justify-center rounded-full border border-white/20 px-8 py-3.5 text-sm font-medium text-white transition-all duration-300 hover:border-white/40 hover:bg-white/5"
              >
                Contact Us
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer - Ultra Minimalist */}
      <footer className="relative border-t border-white/5 py-16 px-6">
        <div className="relative z-10 mx-auto max-w-[900px] text-center">
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

      {/* Product Detail Modal */}
      <ProductModal product={selectedProduct} isOpen={isModalOpen} onClose={handleCloseModal} />
    </div>
  );
}