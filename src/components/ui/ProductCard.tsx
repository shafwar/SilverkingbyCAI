"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useTranslations } from "next-intl";
import type { Product } from "./ProductModal";

export type ProductWithPricing = Product & {
  rangeName?: string;
  memberPrice?: number;
  regularPrice?: number;
  awards?: string[]; // Array of award types: 'gold', 'silver', 'bronze', 'trophy'
  images?: string[]; // Array of images for slider
  cmsId?: number; // Optional link to CmsProduct id for inline editing
  filterCategory?: string; // Filter category: all, award-winning, exclusives, large-bars, small-bars
};

interface ProductCardProps {
  product: ProductWithPricing;
  onProductSelect?: (product: Product) => void;
  index?: number;
}

export default function ProductCard({ product, onProductSelect, index = 0 }: ProductCardProps) {
  const t = useTranslations("products");
  const images = product.images || (product.image ? [product.image] : []);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const hasMultipleImages = images.length > 1;

  // Auto-slide for products with multiple images - Slower transition
  useEffect(() => {
    if (hasMultipleImages && !isHovered) {
      const interval = setInterval(() => {
        setCurrentImageIndex((prev) => (prev + 1) % images.length);
      }, 7000); // Change image every 7 seconds (slower)
      return () => clearInterval(interval);
    }
  }, [hasMultipleImages, isHovered, images.length]);

  const goToNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentImageIndex((prev) => (prev + 1) % images.length);
  };

  const goToPrevious = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentImageIndex((prev) => (prev - 1 + images.length) % images.length);
  };

  const formatPrice = (price?: number) => {
    if (!price) return null;
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price);
  };

  // Get single price (prefer memberPrice, fallback to regularPrice)
  const displayPrice = product.memberPrice || product.regularPrice;

  // Split product name into range name and product name
  const rangeName = product.rangeName || "";
  // Use product name as-is (no weight removal needed)
  const productName = product.name;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.5, delay: index * 0.05 }}
      className="product-card group relative"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Product Image Container with Slider */}
      <div className="relative aspect-[3/4] overflow-hidden bg-gradient-to-br from-luxury-black/50 to-[#1a1a1a]/50 rounded-lg border border-white/10 group-hover:border-luxury-gold/30 transition-all duration-500">
        <AnimatePresence mode="wait">
          {images.map(
            (img, idx) =>
              idx === currentImageIndex && (
                <motion.img
                  key={`${product.id}-${idx}`}
                  src={img}
                  alt={`${product.name} - Image ${idx + 1}`}
                  className="absolute inset-0 w-full h-full object-cover"
                  initial={{ opacity: 0, scale: 1.02 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  transition={{
                    duration: 1.2,
                    ease: [0.25, 0.1, 0.25, 1],
                    opacity: { duration: 1.0 },
                    scale: { duration: 1.2 },
                  }}
                />
              )
          )}
        </AnimatePresence>

        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

        {/* Navigation Arrows - Only show if multiple images */}
        {hasMultipleImages && (
          <>
            <button
              onClick={goToPrevious}
              className="absolute left-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/50 hover:bg-black/70 backdrop-blur-sm border border-white/20 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10"
              aria-label="Previous image"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={goToNext}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/50 hover:bg-black/70 backdrop-blur-sm border border-white/20 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10"
              aria-label="Next image"
            >
              <ChevronRight className="w-4 h-4" />
            </button>

            {/* Image Indicators */}
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10">
              {images.map((_, idx) => (
                <button
                  key={idx}
                  onClick={(e) => {
                    e.stopPropagation();
                    setCurrentImageIndex(idx);
                  }}
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    idx === currentImageIndex
                      ? "w-6 bg-luxury-gold"
                      : "w-1.5 bg-white/30 hover:bg-white/50"
                  }`}
                  aria-label={`Go to image ${idx + 1}`}
                />
              ))}
            </div>
          </>
        )}
      </div>

      {/* Product Info */}
      <div className="product-card__info mt-6 px-4 pb-6 text-center">
        <div className="space-y-3">
          <div className="product-title">
            {rangeName && (
              <span className="product-title__range-name block text-xs font-extralight text-luxury-gold/60 mb-2 tracking-wide uppercase">
                {rangeName}
              </span>
            )}
            <span className="product-title__name block text-sm font-extralight text-white/90 leading-relaxed group-hover:text-luxury-gold transition-colors duration-300">
              {productName}
            </span>
            {product.weight && (
              <span className="product-title__weight block text-xs font-extralight text-white/50 mt-1">
                {product.weight}
              </span>
            )}
          </div>

          {/* Single Price - Always show, display "Coming Soon" if no price */}
          <div className="product-card__price pt-2">
            <span className="text-xs font-extralight text-white/60 tracking-wide">
              {displayPrice ? formatPrice(displayPrice) : `Rp. ${t("comingSoon")}`}
            </span>
          </div>
        </div>
      </div>

      <style jsx>{`
        .product-card {
          position: relative;
          transition: transform 0.4s ease-out;
        }

        .product-card:hover {
          transform: translateY(-8px);
        }

        .product-card__figure {
          position: relative;
        }
      `}</style>
    </motion.div>
  );
}
