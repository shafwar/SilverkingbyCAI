"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import type { Product } from "./ProductModal";

export type ProductWithPricing = Product & {
  rangeName?: string;
  memberPrice?: number;
  regularPrice?: number;
  awards?: string[]; // Array of award types: 'gold', 'silver', 'bronze', 'trophy'
};

interface ProductCardProps {
  product: ProductWithPricing;
  onProductSelect?: (product: Product) => void;
  index?: number;
}

export default function ProductCard({ product, onProductSelect, index = 0 }: ProductCardProps) {
  const handleClick = () => {
    if (onProductSelect) {
      onProductSelect(product);
    }
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
      className="product-card product-card--popout-effect group"
    >
      <div className="product-card__figure relative">
        <Link
          href={`/products/${product.id}`}
          onClick={(e) => {
            e.preventDefault();
            handleClick();
          }}
          className="product-card__media block relative"
        >
          {/* Product Image Container */}
          <div className="relative aspect-[3/4] overflow-hidden bg-gradient-to-br from-[#e8ddd0]/20 to-[#d4c9bc]/20">
            {product.image ? (
              <motion.img
                src={product.image}
                alt={product.name}
                className="product-card__image product-card__image--primary w-full h-full object-cover"
                whileHover={{ scale: 1.02 }}
                transition={{ duration: 0.4, ease: "easeOut" }}
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center">
                <div className="h-24 w-24 rounded-full bg-gradient-to-br from-[#8b7355]/20 to-[#5a4a3a]/20 flex items-center justify-center">
                  <span className="text-4xl">✨</span>
                </div>
              </div>
            )}
          </div>
        </Link>
      </div>

      {/* Product Info */}
      <div className="product-card__info mt-6 px-4 pb-6 text-center">
        <div className="space-y-3">
          <Link
            href={`/products/${product.id}`}
            onClick={(e) => {
              e.preventDefault();
              handleClick();
            }}
            className="product-title block group-hover:text-[#8b7355] transition-colors"
          >
            {rangeName && (
              <span className="product-title__range-name block text-xs font-extralight text-[#8b7355]/60 mb-2 tracking-wide uppercase">
                {rangeName}
              </span>
            )}
            <span className="product-title__name block text-sm font-extralight text-[#5a4a3a] leading-relaxed">
              {productName}
            </span>
            {product.weight && (
              <span className="product-title__weight block text-xs font-extralight text-[#8b7355]/50 mt-1">
                {product.weight}
              </span>
            )}
          </Link>

          {/* Single Price - Always show, display "-" if no price */}
          <div className="product-card__price pt-2">
            <span className="text-xs font-extralight text-[#8b7355]/70 tracking-wide">
              {displayPrice ? formatPrice(displayPrice) : "-"}
            </span>
          </div>
        </div>
      </div>

      <style jsx>{`
        .product-card {
          position: relative;
        }

        .product-card--popout-effect {
          transition: transform 0.4s ease-out;
        }

        .product-card--popout-effect:hover {
          transform: translateY(-4px);
        }

        .product-card__figure {
          position: relative;
        }
      `}</style>
    </motion.div>
  );
}

