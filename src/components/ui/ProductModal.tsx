"use client";

import { AnimatePresence, motion, type Variants } from "framer-motion";
import { useEffect } from "react";
import Link from "next/link";
import { X, Shield, Scale, Gem } from "lucide-react";

/**
 * ProductModal Component
 *
 * Modal untuk menampilkan detail produk dengan desain compact dan elegan.
 *
 * BACKEND INTEGRATION GUIDE:
 * ===========================
 *
 * 1. Product Type Structure:
 *    - Pastikan backend API mengembalikan data dengan struktur berikut:
 *      {
 *        id: string,
 *        name: string,
 *        image?: string,           // URL gambar produk (optional, fallback ke icon)
 *        purity: string,           // Format: "99.99%"
 *        weight: string,           // Format: "1kg", "500g", "1oz (31.1g)"
 *        description: string,
 *        category: string,
 *        price?: number,           // Optional: harga produk
 *        qrCode?: string,          // Optional: QR code untuk verifikasi
 *        stock?: number,           // Optional: stok tersedia
 *        createdAt?: string,       // Optional: tanggal dibuat
 *        updatedAt?: string        // Optional: tanggal update
 *      }
 *
 * 2. API Endpoint Example:
 *    GET /api/products/:id
 *    Response: { success: true, data: Product }
 *
 * 3. Usage dengan Backend:
 *    ```tsx
 *    const [product, setProduct] = useState<Product | null>(null);
 *    const [loading, setLoading] = useState(false);
 *
 *    const fetchProduct = async (productId: string) => {
 *      setLoading(true);
 *      try {
 *        const response = await fetch(`/api/products/${productId}`);
 *        const result = await response.json();
 *        if (result.success) {
 *          setProduct(result.data);
 *          setIsModalOpen(true);
 *        }
 *      } catch (error) {
 *        console.error('Error fetching product:', error);
 *      } finally {
 *        setLoading(false);
 *      }
 *    };
 *    ```
 *
 * 4. Database Schema Suggestion:
 *    - products table:
 *      * id (UUID/INT, PRIMARY KEY)
 *      * name (VARCHAR)
 *      * image_url (TEXT, nullable)
 *      * purity (VARCHAR)
 *      * weight (VARCHAR)
 *      * description (TEXT)
 *      * category (VARCHAR)
 *      * price (DECIMAL, nullable)
 *      * qr_code (VARCHAR, nullable, UNIQUE)
 *      * stock (INT, nullable)
 *      * created_at (TIMESTAMP)
 *      * updated_at (TIMESTAMP)
 *
 * 5. Optional Enhancements:
 *    - Tambahkan loading state saat fetch data
 *    - Tambahkan error handling untuk produk tidak ditemukan
 *    - Tambahkan cache untuk produk yang sudah di-fetch
 *    - Tambahkan analytics tracking untuk produk yang dilihat
 */

const modalVariants: Variants = {
  hidden: {
    opacity: 0,
    scale: 0.95,
    y: 20,
    transition: { duration: 0.3, ease: [0.22, 1, 0.36, 1] },
  },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: {
      duration: 0.5,
      ease: [0.22, 1, 0.36, 1],
      staggerChildren: 0.1,
      delayChildren: 0.1,
    },
  },
  exit: {
    opacity: 0,
    scale: 0.95,
    y: 20,
    transition: { duration: 0.3, ease: [0.22, 1, 0.36, 1] },
  },
};

const contentVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] },
  },
};

const backdropVariants: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.3 } },
  exit: { opacity: 0, transition: { duration: 0.2 } },
};

export type Product = {
  id: string;
  name: string;
  image?: string;
  purity: string;
  weight: string;
  description: string;
  category: string;
  price?: number;
  qrCode?: string;
  stock?: number;
};

interface ProductModalProps {
  product: Product | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function ProductModal({ product, isOpen, onClose }: ProductModalProps) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
      document.body.classList.add("modal-active");
    } else {
      document.body.style.overflow = "unset";
      document.body.classList.remove("modal-active");
    }
    return () => {
      document.body.style.overflow = "unset";
      document.body.classList.remove("modal-active");
    };
  }, [isOpen]);

  if (!product) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            variants={backdropVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            onClick={onClose}
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-md"
          />

          {/* Modal Container - Minimalist & Elegant */}
          <motion.div
            variants={modalVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
            onClick={onClose}
          >
            <motion.div
              variants={contentVariants}
              onClick={(e) => e.stopPropagation()}
              className="group relative w-full max-w-md overflow-hidden rounded-2xl border border-white/10 bg-[#0a0a0a] p-8 md:p-10 shadow-2xl"
            >
              {/* Subtle gradient overlay */}
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/[0.02] via-transparent to-transparent" />

              {/* Close Button - Minimalist */}
              <motion.button
                onClick={onClose}
                whileHover={{ scale: 1.1, rotate: 90 }}
                whileTap={{ scale: 0.95 }}
                transition={{ type: "spring", stiffness: 400, damping: 17 }}
                className="absolute right-4 top-4 z-10 rounded-lg border border-white/10 bg-white/5 p-2 text-white/70 transition-colors hover:bg-white/10 hover:text-white hover:border-white/20"
                aria-label="Close modal"
              >
                <X className="h-4 w-4" />
              </motion.button>

              {/* Content - Minimalist Layout */}
              <div className="flex flex-col items-center text-center space-y-6">
                {/* Category Badge - Minimalist */}
                <motion.span
                  variants={contentVariants}
                  className="inline-block text-[0.7rem] font-extralight tracking-[0.25em] uppercase text-white/40"
                >
                  {product.category}
                </motion.span>

                {/* Product Image - Clean & Minimalist */}
                <motion.div
                  variants={contentVariants}
                  whileHover={{ scale: 1.02 }}
                  transition={{ type: "spring", stiffness: 300 }}
                  className="relative flex h-48 w-48 items-center justify-center overflow-hidden rounded-xl border border-white/10 bg-gradient-to-br from-white/[0.03] to-transparent"
                >
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
                    <Gem className="h-20 w-20 text-white/20" />
                  )}
                </motion.div>

                {/* Product Name - Minimalist Typography */}
                <motion.h2
                  variants={contentVariants}
                  className="max-w-xs text-2xl md:text-3xl font-extralight leading-[1.2] tracking-[-0.02em] text-white"
                >
                  {product.name}
                </motion.h2>

                {/* Description - Subtle */}
                <motion.p
                  variants={contentVariants}
                  className="max-w-sm text-sm font-extralight leading-relaxed text-white/50"
                >
                  {product.description}
                </motion.p>

                {/* Product Details - Minimalist Cards */}
                <motion.div variants={contentVariants} className="flex w-full flex-col gap-3">
                  {/* Purity */}
                  <motion.div
                    whileHover={{ scale: 1.02, borderColor: "rgba(255,255,255,0.2)" }}
                    transition={{ type: "spring", stiffness: 300 }}
                    className="flex items-center gap-4 rounded-lg border border-white/10 bg-white/[0.02] p-4 backdrop-blur-sm"
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-white/10 bg-white/5">
                      <Shield className="h-4 w-4 text-white/60" />
                    </div>
                    <div className="flex-1 text-left">
                      <p className="text-[0.65rem] uppercase tracking-[0.2em] text-white/40 font-extralight">
                        Purity
                      </p>
                      <p className="text-base font-extralight text-white/90">{product.purity}</p>
                    </div>
                  </motion.div>

                  {/* Weight */}
                  <motion.div
                    whileHover={{ scale: 1.02, borderColor: "rgba(255,255,255,0.2)" }}
                    transition={{ type: "spring", stiffness: 300 }}
                    className="flex items-center gap-4 rounded-lg border border-white/10 bg-white/[0.02] p-4 backdrop-blur-sm"
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-white/10 bg-white/5">
                      <Scale className="h-4 w-4 text-white/60" />
                    </div>
                    <div className="flex-1 text-left">
                      <p className="text-[0.65rem] uppercase tracking-[0.2em] text-white/40 font-extralight">
                        Weight
                      </p>
                      <p className="text-base font-extralight text-white/90">{product.weight}</p>
                    </div>
                  </motion.div>
                </motion.div>

                {/* Action Buttons - Minimalist */}
                <motion.div variants={contentVariants} className="flex w-full flex-col gap-3 pt-2">
                  <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                    <Link
                      href={`/verify${product.qrCode ? `?code=${product.qrCode}` : ""}`}
                      className="block w-full rounded-lg border border-white/20 bg-white/5 px-6 py-3.5 text-center text-sm font-extralight tracking-wide text-white/90 backdrop-blur-sm transition-all hover:border-white/30 hover:bg-white/10 hover:text-white"
                    >
                      Verify Product
                    </Link>
                  </motion.div>
                  <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                    <Link
                      href="/contact"
                      className="block w-full rounded-lg border border-white/10 bg-white/[0.02] px-6 py-3.5 text-center text-sm font-extralight tracking-wide text-white/60 backdrop-blur-sm transition-all hover:border-white/20 hover:bg-white/5 hover:text-white/80"
                    >
                      Contact Us
                    </Link>
                  </motion.div>
                </motion.div>

                {/* Optional: QR Code Display (uncomment when backend provides QR code) */}
                {/* {product.qrCode && (
                  <div className="mt-4 rounded-xl border border-white/5 bg-white/5 p-4 text-center">
                    <p className="mb-2 text-xs text-luxury-silver/50">QR Code Produk</p>
                    <div className="mx-auto w-32 h-32 bg-white p-2 rounded">
                      <QRCodeSVG value={product.qrCode} size={128} />
                    </div>
                    <p className="mt-2 text-xs font-mono text-luxury-gold">{product.qrCode}</p>
                  </div>
                )} */}
              </div>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
