"use client";

import Navbar from "@/components/layout/Navbar";
import { motion, AnimatePresence, type Variants } from "framer-motion";
import Link from "next/link";
import { Sparkles, Gem, ArrowRight, Shield, ArrowDown, QrCode } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { APP_NAME } from "@/utils/constants";
import { useRef, useState, useEffect } from "react";
import { useTranslations, useLocale } from "next-intl";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import ProductModal, { type Product } from "@/components/ui/ProductModal";
import ProductCard, { type ProductWithPricing } from "@/components/ui/ProductCard";

// === Hanya menampilkan 5 produk sesuai instruksi ===
const allProducts: ProductWithPricing[] = [
  {
    id: "1",
    name: "50gr",
    image: "/images/50gr.jpeg",
    purity: "",
    weight: "",
    description: "",
    category: "",
  },
  {
    id: "2",
    name: "50gr (2)",
    image: "/images/50gr(2).jpeg",
    purity: "",
    weight: "",
    description: "",
    category: "",
  },
  {
    id: "3",
    name: "100gr",
    image: "/images/100gr.jpeg",
    purity: "",
    weight: "",
    description: "",
    category: "",
  },
  {
    id: "4",
    name: "100gr (2)",
    image: "/images/100gr(2).jpeg",
    purity: "",
    weight: "",
    description: "",
    category: "",
  },
  {
    id: "5",
    name: "silverking-gold",
    image: "/images/silverking-gold.jpeg",
    purity: "",
    weight: "",
    description: "",
    category: "",
  },
];

export default function ProductsPage() {
  const t = useTranslations("products");
  const tNav = useTranslations("nav");
  const locale = useLocale();
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
  const [isMounted, setIsMounted] = useState(false);

  // --- Animasi disingkat (detail GSAP dihilangkan untuk ringkas, restore jika perlu) ---
  useEffect(() => setIsMounted(true), []);

  return (
    <div ref={pageRef} className="min-h-screen bg-luxury-black text-white">
      <Navbar />
      <section className="relative px-6 md:px-8 lg:px-12 pt-32 pb-24 md:pt-40 md:pb-32 lg:pt-48 lg:pb-40 min-h-[50vh] md:min-h-[60vh] flex items-center">
        <div className="relative z-10 w-full max-w-[1400px] mx-auto text-center">
          <h1 className="text-4xl md:text-5xl font-light mb-3">
            {t("hero.title")} <strong className="font-semibold">{t("hero.titleBold")}</strong>
          </h1>
          <p className="text-white/60 text-lg max-w-xl mx-auto">{t("hero.subtitle")}</p>
        </div>
      </section>
      <section id="products-section" className="relative py-8 md:py-12 bg-[#f5f0e8]">
        <div className="max-w-6xl mx-auto px-2 md:px-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-10">
            {allProducts.map((product, idx) => (
              <ProductCard key={product.id} product={product} index={idx} />
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
