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
    scale: 0.9,
    transition: { duration: 0.2 },
  },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { duration: 0.3, ease: [0.22, 1, 0.36, 1] },
  },
  exit: {
    opacity: 0,
    scale: 0.9,
    transition: { duration: 0.2 },
  },
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
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-40 bg-black/25 backdrop-blur-[17px]"
          />

          {/* Modal Container - Premium Vertical Card */}
          <motion.div
            variants={modalVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
            onClick={onClose}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="group relative overflow-hidden rounded-[32px] border border-white/10 bg-gradient-to-b from-[#050505] via-[#0a0a0a] to-[#010101] p-6 shadow-[0_30px_70px_rgba(0,0,0,0.65)]"
            >
              <div
                className="pointer-events-none absolute inset-0 opacity-50 mix-blend-screen"
                style={{
                  background:
                    "linear-gradient(120deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0) 50%, rgba(255,255,255,0.1) 100%)",
                }}
              />
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-white/15 via-transparent to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-20" />

              {/* Close Button */}
              <button
                onClick={onClose}
                className="absolute right-4 top-4 z-10 rounded-full border border-white/10 bg-white/5 p-2 text-white transition-all hover:bg-white/10 hover:text-luxury-gold"
                aria-label="Close modal"
              >
                <X className="h-4 w-4" />
              </button>

              {/* Premium Vertical Content */}
              <div className="flex flex-col items-center text-center">
                <span className="mb-6 inline-flex items-center rounded-full border border-luxury-gold/20 bg-luxury-gold/5 px-4 py-1 text-[11px] font-semibold uppercase tracking-[0.3em] text-luxury-gold/90">
                  {product.category}
                </span>

                <div className="relative mb-6 flex h-40 w-40 items-center justify-center overflow-hidden rounded-[28px] border border-white/10 bg-gradient-to-br from-luxury-gold/15 via-luxury-silver/10 to-transparent shadow-[0_25px_60px_rgba(0,0,0,0.45)]">
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
                    <Gem className="h-16 w-16 text-luxury-gold/60" />
                  )}
                  <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-white/10" />
                </div>

                <h2 className="mb-4 max-w-xs text-3xl font-semibold tracking-tight text-white">
                  {product.name}
                </h2>
                <p className="mb-8 text-sm leading-relaxed text-luxury-silver/70">
                  {product.description}
                </p>

                <div className="mb-8 flex w-full flex-col gap-4">
                  <div className="flex items-center gap-4 rounded-2xl border border-white/10 bg-white/5 p-4">
                    <div className="rounded-2xl bg-luxury-gold/10 p-3">
                      <Shield className="h-5 w-5 text-luxury-gold" />
                    </div>
                    <div className="flex-1 text-left">
                      <p className="text-[11px] uppercase tracking-[0.3em] text-luxury-silver/50">
                        Kemurnian
                      </p>
                      <p className="text-lg font-semibold text-white">{product.purity}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 rounded-2xl border border-white/10 bg-white/5 p-4">
                    <div className="rounded-2xl bg-luxury-gold/10 p-3">
                      <Scale className="h-5 w-5 text-luxury-gold" />
                    </div>
                    <div className="flex-1 text-left">
                      <p className="text-[11px] uppercase tracking-[0.3em] text-luxury-silver/50">
                        Berat
                      </p>
                      <p className="text-lg font-semibold text-white">{product.weight}</p>
                    </div>
                  </div>

                  {/* Optional: Price Display (uncomment when backend provides price) */}
                  {/* {product.price && (
                    <div className="flex items-center gap-2">
                      <div className="rounded-lg bg-luxury-gold/10 p-2">
                        <DollarSign className="h-4 w-4 text-luxury-gold" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-[10px] uppercase tracking-wide text-luxury-silver/50">
                          Harga
                        </p>
                        <p className="text-sm font-semibold text-white">
                          {new Intl.NumberFormat("id-ID", {
                            style: "currency",
                            currency: "IDR",
                          }).format(product.price)}
                        </p>
                      </div>
                    </div>
                  )} */}

                  {/* Optional: Stock Display (uncomment when backend provides stock) */}
                  {/* {product.stock !== undefined && (
                    <div className="flex items-center gap-2">
                      <div className="rounded-lg bg-luxury-gold/10 p-2">
                        <Package className="h-4 w-4 text-luxury-gold" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-[10px] uppercase tracking-wide text-luxury-silver/50">
                          Stok
                        </p>
                        <p className="text-sm font-semibold text-white">
                          {product.stock > 0 ? `${product.stock} tersedia` : "Habis"}
                        </p>
                      </div>
                    </div>
                  )} */}
                </div>

                {/* Action Buttons - Vertical Card */}
                <div className="flex w-full flex-col gap-3 sm:flex-row">
                  <Link
                    href={`/verify${product.qrCode ? `?code=${product.qrCode}` : ""}`}
                    className="flex-1 rounded-2xl bg-gradient-to-r from-luxury-gold via-luxury-lightGold to-[#f8e0a3] px-6 py-3 text-center text-sm font-semibold uppercase tracking-wide text-black shadow-[0_20px_50px_-20px_rgba(212,175,55,0.7)] transition-transform hover:-translate-y-0.5"
                  >
                    Verifikasi Produk
                  </Link>
                  <Link
                    href="/contact"
                    className="flex-1 rounded-2xl border border-white/15 bg-white/5 px-6 py-3 text-center text-sm font-semibold uppercase tracking-wide text-white transition hover:bg-white/10"
                  >
                    Hubungi Kami
                  </Link>
                </div>

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
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
