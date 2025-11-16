"use client";

import { useState, useRef } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { motion } from "framer-motion";
import { QrCode, ArrowRight, Package, Eye } from "lucide-react";
import { MotionFadeIn } from "@/components/shared/MotionFadeIn";
import { ProductDrawer } from "@/components/shared/ProductDrawer";
import Link from "next/link";
import { useRouter } from "next/navigation";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

interface Product {
  id: string;
  name: string;
  weight: string;
  purity: string;
  serialPrefix: string;
  imageUrl?: string;
  description?: string;
}

const products: Product[] = [
  {
    id: "1",
    name: "Silver King 5gr Bar",
    weight: "5gr",
    purity: "99.99%",
    serialPrefix: "SKT",
    description: "Premium 5-gram silver bar, perfect for collectors and first-time investors.",
  },
  {
    id: "2",
    name: "Silver King 10gr Bar",
    weight: "10gr",
    purity: "99.99%",
    serialPrefix: "SKI",
    description: "Elegant 10-gram silver bar with exceptional purity and craftsmanship.",
  },
  {
    id: "3",
    name: "Silver King 25gr Bar",
    weight: "25gr",
    purity: "99.99%",
    serialPrefix: "SKC",
    description: "Handcrafted 25-gram silver bar meeting LBMA standards.",
  },
  {
    id: "4",
    name: "Silver King 50gr Bar",
    weight: "50gr",
    purity: "99.99%",
    serialPrefix: "SKN",
    description: "Premium 50-gram silver bar with QR-authenticated traceability.",
  },
  {
    id: "5",
    name: "Silver King 100gr Bar",
    weight: "100gr",
    purity: "99.99%",
    serialPrefix: "SKP",
    description: "Investment-grade 100-gram silver bar, ISO 9001 certified.",
  },
  {
    id: "6",
    name: "Silver King 250gr Bar",
    weight: "250gr",
    purity: "99.99%",
    serialPrefix: "SKA",
    description: "Luxury 250-gram silver bar with complete provenance documentation.",
  },
  {
    id: "7",
    name: "Silver King 500gr Bar",
    weight: "500gr",
    purity: "99.99%",
    serialPrefix: "SKA",
    description: "Premium 500-gram silver bar, the pinnacle of precious metal craftsmanship.",
  },
];

export default function ProductsPage() {
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const heroRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useGSAP(
    () => {
      if (!heroRef.current) return;

      const ctx = gsap.context(() => {
        // Hero animation
        gsap.fromTo(
          heroRef.current?.querySelectorAll("[data-hero]") || [],
          { opacity: 0, y: 60 },
          {
            opacity: 1,
            y: 0,
            duration: 1.2,
            stagger: 0.15,
            ease: "power3.out",
          }
        );

        // Grid stagger animation
        if (gridRef.current) {
          ScrollTrigger.batch("[data-product]", {
            start: "top 80%",
            onEnter: (batch) =>
              gsap.to(batch, {
                opacity: 1,
                y: 0,
                scale: 1,
                duration: 0.6,
                stagger: 0.08,
                ease: "power2.out",
              }),
            once: true,
          });
        }
      }, heroRef);

      return () => ctx.revert();
    },
    { scope: heroRef }
  );

  const handleProductClick = (product: Product) => {
    setSelectedProduct(product);
    setIsDrawerOpen(true);
  };

  const handleVerify = () => {
    if (selectedProduct) {
      setIsDrawerOpen(false);
      router.push(`/authenticity`);
    }
  };

  return (
    <div className="min-h-screen bg-luxury-black text-white selection:bg-luxury-gold/20 selection:text-white">
      {/* Hero Section */}
      <section
        ref={heroRef}
        className="relative min-h-screen flex items-center justify-center overflow-hidden bg-gradient-to-b from-black via-[#0a0a0a] to-black"
      >
        {/* Animated Background */}
        <div className="absolute inset-0 z-0">
          <div className="absolute inset-0 bg-gradient-to-b from-black/90 via-black/60 to-black/90" />
          
          {/* Metallic Gradient Overlays */}
          <div className="absolute inset-0 bg-gradient-to-br from-luxury-gold/5 via-transparent to-luxury-silver/5" />
          <div className="absolute inset-0 bg-gradient-to-tl from-transparent via-transparent to-luxury-gold/5" />
        </div>

        {/* Content */}
        <div className="relative z-10 mx-auto w-full max-w-6xl px-6 py-24 text-center">
          <MotionFadeIn direction="up">
            <motion.div data-hero className="mb-6">
              <motion.div
                animate={{ rotate: [0, 5, -5, 0] }}
                transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
                className="mx-auto mb-8 flex h-24 w-24 items-center justify-center rounded-full border-2 border-luxury-gold/30 bg-gradient-to-br from-luxury-gold/10 to-transparent"
              >
                <Package className="h-12 w-12 text-luxury-gold" />
              </motion.div>
            </motion.div>
          </MotionFadeIn>

          <MotionFadeIn direction="up" delay={0.2}>
            <motion.h1
              data-hero
              className="mb-6 font-sans text-5xl font-bold leading-tight sm:text-6xl md:text-7xl"
            >
              <span className="bg-gradient-to-r from-luxury-gold via-luxury-lightGold to-luxury-gold bg-clip-text text-transparent">
                Our Precious Metal
              </span>
              <br />
              <span className="text-white">Collection</span>
            </motion.h1>
          </MotionFadeIn>

          <MotionFadeIn direction="up" delay={0.4}>
            <motion.p
              data-hero
              className="mx-auto mb-12 max-w-3xl text-lg leading-relaxed text-white/80 sm:text-xl md:text-2xl"
            >
              Crafted for purity, trust, and investment-grade value. Each bar comes with
              QR-verified authenticity and complete traceability.
            </motion.p>
          </MotionFadeIn>
        </div>
      </section>

      {/* Products Grid */}
      <section className="relative border-t border-white/10 bg-gradient-to-b from-black via-[#0a0a0a] to-black py-24 px-6">
        <div className="mx-auto max-w-7xl">
          <MotionFadeIn className="mb-16 text-center">
            <h2 className="mb-4 font-sans text-4xl font-bold sm:text-5xl">
              <span className="text-white">Explore Our</span>{" "}
              <span className="bg-gradient-to-r from-luxury-gold to-luxury-lightGold bg-clip-text text-transparent">
                Products
              </span>
            </h2>
            <p className="mx-auto max-w-2xl text-lg text-white/60">
              Select any product to view detailed specifications
            </p>
          </MotionFadeIn>

          <div
            ref={gridRef}
            className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
          >
            {products.map((product, index) => (
              <motion.div
                key={product.id}
                data-product
                initial={{ opacity: 0, y: 40, scale: 0.95 }}
                className="group relative cursor-pointer"
                onClick={() => handleProductClick(product)}
              >
                <div className="relative h-full overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-white/5 via-white/[0.02] to-transparent p-8 backdrop-blur-xl transition-all duration-500 hover:border-luxury-gold/40 hover:bg-white/10 hover:shadow-[0px_30px_80px_-40px_rgba(212,175,55,0.6)]">
                  {/* Metallic Shine Effect */}
                  <div className="absolute inset-0 bg-gradient-to-br from-luxury-gold/10 via-transparent to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />

                  {/* Product Image Placeholder */}
                  <div className="mb-6 aspect-square w-full overflow-hidden rounded-xl border border-white/10 bg-gradient-to-br from-luxury-gold/10 to-transparent">
                    <div className="flex h-full items-center justify-center">
                      <QrCode className="h-16 w-16 text-luxury-gold/30" />
                    </div>
                  </div>

                  {/* Product Info */}
                  <div className="relative z-10">
                    <div className="mb-2 flex items-center justify-between">
                      <span className="rounded-full bg-luxury-gold/20 px-3 py-1 text-xs font-semibold text-luxury-gold">
                        {product.serialPrefix}
                      </span>
                      <span className="text-sm font-semibold text-white/80">{product.weight}</span>
                    </div>

                    <h3 className="mb-2 font-sans text-xl font-bold text-white">{product.name}</h3>
                    <p className="mb-4 text-sm text-white/60">{product.purity} Pure</p>

                    {/* Action Buttons */}
                    <div className="flex gap-2">
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        className="flex-1 rounded-lg border border-white/20 bg-white/5 px-4 py-2 text-sm font-semibold text-white backdrop-blur-sm transition-all hover:bg-white/10"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleProductClick(product);
                        }}
                      >
                        <div className="flex items-center justify-center gap-2">
                          <Eye className="h-4 w-4" />
                          <span>View</span>
                        </div>
                      </motion.button>

                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        className="flex-1 rounded-lg bg-gradient-to-r from-luxury-gold to-luxury-lightGold px-4 py-2 text-sm font-semibold text-black transition-all hover:shadow-lg hover:shadow-luxury-gold/30"
                        onClick={(e) => {
                          e.stopPropagation();
                          router.push("/authenticity");
                        }}
                      >
                        <div className="flex items-center justify-center gap-2">
                          <QrCode className="h-4 w-4" />
                          <span>Verify</span>
                        </div>
                      </motion.button>
                    </div>
                  </div>

                  {/* Hover Glow */}
                  <div className="absolute -bottom-1 left-0 h-[2px] w-0 bg-gradient-to-r from-luxury-gold to-transparent transition-all duration-500 group-hover:w-full" />
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative border-t border-white/10 bg-gradient-to-b from-black via-[#0a0a0a] to-black py-24 px-6">
        <div className="mx-auto max-w-4xl text-center">
          <MotionFadeIn>
            <h2 className="mb-6 font-sans text-4xl font-bold sm:text-5xl">
              Ready to Authenticate?
            </h2>
            <p className="mb-10 text-lg text-white/70">
              Verify your Silver King bar to view complete provenance details
            </p>
            <Link
              href="/authenticity"
              className="group relative inline-flex items-center justify-center gap-3 overflow-hidden rounded-full bg-gradient-to-r from-luxury-gold to-luxury-lightGold px-9 py-4 text-base font-semibold text-black transition-all duration-300 hover:shadow-[0_35px_90px_-35px_rgba(212,175,55,0.8)]"
            >
              Verify Now
              <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
            </Link>
          </MotionFadeIn>
        </div>
      </section>

      {/* Product Drawer */}
      {selectedProduct && (
        <ProductDrawer
          isOpen={isDrawerOpen}
          onClose={() => {
            setIsDrawerOpen(false);
            setTimeout(() => setSelectedProduct(null), 300);
          }}
          product={selectedProduct}
          onVerify={handleVerify}
        />
      )}
    </div>
  );
}

