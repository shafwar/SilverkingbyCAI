"use client";

import { useEffect, useState, useMemo } from "react";
import { useParams } from "next/navigation";
import { motion } from "framer-motion";
import Link from "next/link";
import Navbar from "@/components/layout/Navbar";
import {
  Shield,
  CheckCircle2,
  XCircle,
  ArrowLeft,
  Package,
  Scale,
  Layers,
  Calendar,
  Hash,
  Banknote,
  KeyRound,
} from "lucide-react";

interface VerificationResult {
  verified: boolean;
  requiresRootKey?: boolean;
  product?: {
    name: string;
    weight: number;
    serialCode: string;
    actualSerialCode?: string;
    price?: number | null;
    stock?: number | null;
    qrImageUrl?: string;
    createdAt: string;
  };
  error?: string;
}

/** Background images for verified-success state only. Random one per page load. Add more paths to public/images as needed. */
const VERIFIED_BG_IMAGES = [
  "/images/hero-fallback.jpg",
  "/images/merchandise-hero.png",
] as const;

const EASE = [0.22, 1, 0.36, 1] as [number, number, number, number];

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: (delay: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, delay, ease: EASE },
  }),
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.07, delayChildren: 0.15 },
  },
};

const rowReveal = {
  hidden: { opacity: 0, x: -12 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.45, ease: EASE },
  },
};

function InfoRow({
  icon: Icon,
  label,
  value,
  mono,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <motion.div
      variants={rowReveal}
      className="flex items-center justify-between gap-4 py-4 border-b border-white/[0.06] last:border-b-0"
    >
      <div className="flex items-center gap-3 min-w-0">
        <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-white/[0.04]">
          <Icon className="h-4 w-4 text-luxury-gold/60" />
        </div>
        <span className="text-[13px] text-white/45 font-medium">{label}</span>
      </div>
      <span
        className={`text-[14px] font-semibold text-white text-right truncate ${
          mono ? "font-mono tracking-wide text-[13px]" : ""
        }`}
      >
        {value}
      </span>
    </motion.div>
  );
}

export default function VerifyPage() {
  const params = useParams();
  const serialNumber = params.serialNumber as string;
  const [result, setResult] = useState<VerificationResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [rootKey, setRootKey] = useState("");
  const [verifyingRootKey, setVerifyingRootKey] = useState(false);
  const [rootKeyError, setRootKeyError] = useState<string | null>(null);

  /** Random background image index for verified-success only. Picked once when verified, UI-only. */
  const verifiedBgIndex = useMemo(
    () =>
      result?.verified
        ? Math.floor(Math.random() * VERIFIED_BG_IMAGES.length)
        : null,
    [result?.verified]
  );

  // ---------- ALL LOGIC BELOW IS UNCHANGED ----------

  useEffect(() => {
    let isMounted = true;

    async function verifyProduct() {
      try {
        const normalizedSerial =
          serialNumber
            ?.trim()
            .toUpperCase()
            .replace(/[^A-Z0-9]/g, "") || "";

        if (!normalizedSerial || normalizedSerial.length < 3 || normalizedSerial.length > 50) {
          if (isMounted) {
            setResult({
              verified: false,
              error: "Invalid serial number format",
            });
            setLoading(false);
          }
          return;
        }

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);

        const response = await fetch(`/api/verify/${encodeURIComponent(normalizedSerial)}`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: "Unknown error" }));
          if (isMounted) {
            setResult({
              verified: false,
              error: errorData.error || `Verification failed: ${response.status}`,
            });
            setLoading(false);
          }
          return;
        }

        const data = await response.json();

        if (!data || typeof data !== "object" || !("verified" in data)) {
          if (isMounted) {
            setResult({
              verified: false,
              error: "Invalid response from server",
            });
            setLoading(false);
          }
          return;
        }

        if (data.verified && data.product) {
          if (!data.product.serialCode || !data.product.name) {
            if (isMounted) {
              setResult({
                verified: false,
                error: "Invalid product data received",
              });
              setLoading(false);
            }
            return;
          }
        }

        if (isMounted) {
          setResult(data);
          setLoading(false);
        }
      } catch (error: any) {
        if (error.name === "AbortError") {
          if (isMounted) {
            setResult({
              verified: false,
              error: "Request timeout. Please try again.",
            });
            setLoading(false);
          }
          return;
        }

        console.error("Verification error:", error);
        if (isMounted) {
          setResult({
            verified: false,
            error: error?.message || "Failed to verify product. Please try again.",
          });
          setLoading(false);
        }
      }
    }

    if (serialNumber) {
      verifyProduct();
    } else {
      setLoading(false);
      setResult({
        verified: false,
        error: "Serial number is required",
      });
    }

    return () => {
      isMounted = false;
    };
  }, [serialNumber]);

  const getWeightLabel = (weight?: number) => {
    if (!weight) return "—";
    return `${weight} gr`;
  };

  const handleRootKeySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rootKey.trim() || rootKey.trim().length < 3 || rootKey.trim().length > 4) {
      setRootKeyError("Root key must be 3-4 alphanumeric characters");
      return;
    }

    setVerifyingRootKey(true);
    setRootKeyError(null);

    try {
      const uniqCodeForVerification = result?.requiresRootKey
        ? serialNumber
        : result?.product?.serialCode || serialNumber;

      console.log("[VerifyPage] Sending root key verification request:", {
        uniqCode: uniqCodeForVerification,
        rootKey: rootKey.trim().toUpperCase(),
        originalSerialNumber: serialNumber,
        requiresRootKey: result?.requiresRootKey,
      });

      const response = await fetch("/api/verify/root-key", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          uniqCode: uniqCodeForVerification,
          rootKey: rootKey.trim().toUpperCase(),
        }),
      });

      console.log("[VerifyPage] Root key verification response:", {
        status: response.status,
        ok: response.ok,
      });

      let data;
      try {
        data = await response.json();
      } catch (jsonError) {
        console.error("[VerifyPage] Failed to parse JSON response:", jsonError);
        setRootKeyError("Server error. Please try again.");
        setVerifyingRootKey(false);
        return;
      }

      if (!response.ok || !data.verified) {
        const errorMessage =
          data.error || `Verification failed (${response.status}). Please try again.`;
        console.error("[VerifyPage] Root key verification failed:", {
          status: response.status,
          error: errorMessage,
          data,
        });
        setRootKeyError(errorMessage);
        setVerifyingRootKey(false);
        return;
      }

      if (data.serialCode) {
        console.log("[VerifyPage] Root key verified, redirecting to:", data.serialCode);
        window.location.href = `/verify/${encodeURIComponent(data.serialCode)}`;
      } else {
        console.error("[VerifyPage] Verification successful but serialCode missing:", data);
        setRootKeyError(
          "Verification successful but serial code not found. Please contact support."
        );
        setVerifyingRootKey(false);
      }
    } catch (error: any) {
      console.error("Root key verification error:", error);
      setRootKeyError("Failed to verify root key. Please try again.");
      setVerifyingRootKey(false);
    }
  };

  // ---------- END UNCHANGED LOGIC ----------

  return (
    <div className="min-h-screen bg-[#050505] text-white">
      {/* Verified-success only: random classy background image + dark overlay so text never clashes (UI only, no system change) */}
      {result?.verified && verifiedBgIndex !== null && (
        <>
          <div
            className="pointer-events-none fixed inset-0 z-0"
            aria-hidden
          >
            <img
              src={VERIFIED_BG_IMAGES[verifiedBgIndex]}
              alt=""
              className="absolute inset-0 h-full w-full object-cover"
              loading="lazy"
              decoding="async"
              fetchPriority="low"
            />
          </div>
          <div
            className="pointer-events-none fixed inset-0 z-[1]"
            style={{
              background:
                "linear-gradient(180deg, rgba(0,0,0,0.72) 0%, rgba(0,0,0,0.58) 40%, rgba(0,0,0,0.62) 70%, rgba(0,0,0,0.78) 100%)",
            }}
            aria-hidden
          />
        </>
      )}

      {/* Background ambient */}
      <div
        className="pointer-events-none fixed inset-0 z-[2]"
        style={{
          background: result?.verified
            ? "radial-gradient(ellipse 60% 40% at 50% 20%, rgba(34,197,94,0.04) 0%, transparent 60%), radial-gradient(ellipse 50% 35% at 50% 80%, rgba(212,175,55,0.03) 0%, transparent 50%)"
            : result && !result.verified && !result.requiresRootKey
              ? "radial-gradient(ellipse 60% 40% at 50% 20%, rgba(239,68,68,0.04) 0%, transparent 60%)"
              : "radial-gradient(ellipse 60% 40% at 50% 20%, rgba(212,175,55,0.04) 0%, transparent 60%)",
        }}
      />

      <Navbar />

      <div className="relative z-10 pt-28 pb-20 px-4 sm:px-6">
        <div className="mx-auto max-w-2xl">
          {/* ---------- LOADING STATE ---------- */}
          {loading ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center justify-center py-24"
            >
              <div className="relative">
                <div className="h-14 w-14 rounded-full border-2 border-luxury-gold/20" />
                <div className="absolute inset-0 h-14 w-14 animate-spin rounded-full border-2 border-transparent border-t-luxury-gold" />
              </div>
              <p className="mt-5 text-sm font-light tracking-wide text-white/40">
                Verifying product...
              </p>
            </motion.div>
          ) : result?.requiresRootKey ? (
            /* ---------- ROOT KEY REQUIRED ---------- */
            <motion.div
              initial="hidden"
              animate="visible"
              className="space-y-5"
            >
              {/* Header */}
              <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={0} className="text-center mb-2">
                <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl border border-luxury-gold/20 bg-luxury-gold/[0.06]">
                  <KeyRound className="h-7 w-7 text-luxury-gold" />
                </div>
                <h1 className="font-serif text-[1.75rem] font-semibold tracking-[0.01em] text-white">
                  Root Key Required
                </h1>
                <p className="mt-2 text-sm font-light leading-relaxed text-white/45 max-w-md mx-auto">
                  Please enter the root key to complete verification for this product.
                </p>
              </motion.div>

              {/* Product info card */}
              <motion.div
                variants={fadeUp}
                initial="hidden"
                animate="visible"
                custom={0.1}
                className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6 sm:p-7 backdrop-blur-sm"
              >
                <div className="flex items-center gap-2.5 mb-5">
                  <Shield className="h-[18px] w-[18px] text-luxury-gold/70" />
                  <h2 className="text-[13px] font-bold uppercase tracking-[0.15em] text-luxury-gold/70">
                    Product Information
                  </h2>
                </div>
                <motion.div variants={staggerContainer} initial="hidden" animate="visible">
                  <InfoRow icon={Package} label="Product Name" value={result.product?.name || "—"} />
                  <InfoRow icon={Scale} label="Weight" value={getWeightLabel(result.product?.weight)} />
                  {typeof result.product?.stock === "number" && (
                    <InfoRow icon={Layers} label="Quantity" value={`${result.product.stock} pcs`} />
                  )}
                  <InfoRow
                    icon={Calendar}
                    label="Manufacturing Date"
                    value={new Date(result.product?.createdAt || "").toLocaleDateString()}
                  />
                </motion.div>
              </motion.div>

              {/* Root key form */}
              <motion.div
                variants={fadeUp}
                initial="hidden"
                animate="visible"
                custom={0.2}
                className="rounded-2xl border border-luxury-gold/10 bg-luxury-gold/[0.02] p-6 sm:p-7"
              >
                <div className="mb-5 rounded-xl border border-amber-500/15 bg-amber-500/[0.04] px-4 py-3.5">
                  <p className="text-amber-400/90 text-[13px] font-semibold mb-1">
                    Two-Step Verification Required
                  </p>
                  <p className="text-white/40 text-[12px] leading-relaxed">
                    Please enter the root key (3-4 alphanumeric characters) provided by your
                    administrator to verify the specific SKP serial number.
                  </p>
                </div>
                <form onSubmit={handleRootKeySubmit} className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-semibold uppercase tracking-[0.25em] text-white/30 mb-2.5">
                      Root Key (3-4 characters)
                    </label>
                    <input
                      type="text"
                      value={rootKey}
                      onChange={(e) => {
                        setRootKey(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""));
                        setRootKeyError(null);
                      }}
                      maxLength={4}
                      placeholder="e.g., A1H2"
                      className="w-full rounded-xl border border-white/[0.1] bg-white/[0.03] px-5 py-3.5 font-mono text-base tracking-[0.15em] text-white uppercase placeholder:text-white/20 outline-none transition-all duration-300 focus:border-luxury-gold/40 focus:ring-1 focus:ring-luxury-gold/15"
                      disabled={verifyingRootKey}
                    />
                    {rootKeyError && (
                      <div className="mt-2.5 space-y-1">
                        <p className="text-red-400/80 text-[12px]">{rootKeyError}</p>
                        {result?.product?.actualSerialCode && (
                          <p className="text-amber-400/70 text-[11px]">
                            Tip: Make sure you&apos;re using the root key for serial code{" "}
                            <span className="font-mono font-semibold">
                              {result.product.actualSerialCode}
                            </span>{" "}
                            from the admin panel.
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                  <button
                    type="submit"
                    disabled={verifyingRootKey || rootKey.trim().length < 3}
                    className="group relative w-full overflow-hidden rounded-xl py-3.5 text-[13px] font-bold tracking-[0.04em] text-black transition-all duration-300 disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.98]"
                    style={{
                      background:
                        "linear-gradient(135deg, #B8960E 0%, #D4AF37 30%, #FFD700 65%, #D4AF37 100%)",
                    }}
                  >
                    <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/25 to-transparent -translate-x-[200%] group-hover:translate-x-[200%] transition-transform duration-700 pointer-events-none" />
                    <span className="relative z-10">
                      {verifyingRootKey ? "Verifying..." : "Verify Root Key"}
                    </span>
                  </button>
                </form>
              </motion.div>
            </motion.div>
          ) : result?.verified ? (
            /* ---------- VERIFIED SUCCESS ---------- */
            <motion.div
              initial="hidden"
              animate="visible"
              className="space-y-5"
            >
              {/* Success header */}
              <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={0} className="text-center pt-2 pb-1">
                {/* Animated checkmark */}
                <div className="relative mx-auto mb-6 h-20 w-20">
                  {/* Outer pulse ring */}
                  <motion.div
                    className="absolute inset-0 rounded-full border-2 border-emerald-500/30"
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: [0.8, 1.2, 1.2], opacity: [0, 0.5, 0] }}
                    transition={{ duration: 2, repeat: Infinity, ease: "easeOut" }}
                  />
                  {/* Inner circle */}
                  <motion.div
                    className="absolute inset-0 flex items-center justify-center rounded-full"
                    style={{
                      background:
                        "radial-gradient(circle, rgba(34,197,94,0.12) 0%, rgba(34,197,94,0.03) 70%, transparent 100%)",
                    }}
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                  >
                    <motion.div
                      initial={{ scale: 0, rotate: -45 }}
                      animate={{ scale: 1, rotate: 0 }}
                      transition={{ duration: 0.4, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
                    >
                      <CheckCircle2 className="h-12 w-12 text-emerald-500" />
                    </motion.div>
                  </motion.div>
                </div>

                <motion.h1
                  className="font-serif text-[1.85rem] sm:text-[2.1rem] font-semibold tracking-[0.01em] text-white"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
                >
                  Product Verified
                </motion.h1>
                <motion.p
                  className="mt-2.5 text-sm font-light text-white/40"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.5, delay: 0.45 }}
                >
                  This product is officially verified by Silver King by CAI
                </motion.p>

                {/* Decorative divider */}
                <motion.div
                  className="mx-auto mt-5 flex items-center justify-center gap-2.5"
                  initial={{ opacity: 0, scaleX: 0 }}
                  animate={{ opacity: 1, scaleX: 1 }}
                  transition={{ duration: 0.6, delay: 0.5 }}
                >
                  <div className="h-px w-10 bg-gradient-to-r from-transparent to-emerald-500/20" />
                  <div className="h-1 w-1 rounded-full bg-emerald-500/30" />
                  <div className="h-px w-10 bg-gradient-to-l from-transparent to-emerald-500/20" />
                </motion.div>
              </motion.div>

              {/* Product info card */}
              <motion.div
                variants={fadeUp}
                initial="hidden"
                animate="visible"
                custom={0.25}
                className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6 sm:p-7 backdrop-blur-sm"
              >
                <div className="flex items-center gap-2.5 mb-5">
                  <Shield className="h-[18px] w-[18px] text-luxury-gold/70" />
                  <h2 className="text-[13px] font-bold uppercase tracking-[0.15em] text-luxury-gold/70">
                    Product Information
                  </h2>
                </div>
                <motion.div variants={staggerContainer} initial="hidden" animate="visible">
                  <InfoRow icon={Package} label="Product Name" value={result.product?.name || "—"} />
                  <InfoRow icon={Scale} label="Weight" value={getWeightLabel(result.product?.weight)} />
                  {typeof result.product?.stock === "number" && (
                    <InfoRow icon={Layers} label="Quantity" value={`${result.product.stock} pcs`} />
                  )}
                  <InfoRow
                    icon={Calendar}
                    label="Manufacturing Date"
                    value={new Date(result.product?.createdAt || "").toLocaleDateString()}
                  />
                </motion.div>
              </motion.div>

              {/* Serial & Price card */}
              {!result.requiresRootKey && (
                <motion.div
                  variants={fadeUp}
                  initial="hidden"
                  animate="visible"
                  custom={0.4}
                  className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6 sm:p-7 backdrop-blur-sm"
                >
                  <motion.div variants={staggerContainer} initial="hidden" animate="visible">
                    <InfoRow
                      icon={Hash}
                      label="Serial Number"
                      value={result.product?.serialCode || "—"}
                      mono
                    />
                    {typeof result.product?.price === "number" && (
                      <InfoRow
                        icon={Banknote}
                        label="Price"
                        value={`Rp ${result.product.price.toLocaleString("id-ID")}`}
                      />
                    )}
                  </motion.div>
                </motion.div>
              )}

              {/* Back button */}
              <motion.div
                variants={fadeUp}
                initial="hidden"
                animate="visible"
                custom={0.55}
                className="flex justify-center pt-2"
              >
                <Link
                  href="/"
                  className="group inline-flex items-center gap-2.5 rounded-xl border border-white/[0.08] bg-white/[0.03] px-7 py-3 text-[13px] font-medium text-white/60 transition-all duration-300 hover:border-white/[0.15] hover:text-white hover:bg-white/[0.06]"
                >
                  <ArrowLeft className="h-4 w-4 transition-transform duration-300 group-hover:-translate-x-0.5" />
                  Back to Home
                </Link>
              </motion.div>
            </motion.div>
          ) : (
            /* ---------- VERIFICATION FAILED ---------- */
            <motion.div
              initial="hidden"
              animate="visible"
              className="space-y-5"
            >
              <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={0} className="text-center pt-2 pb-1">
                {/* Error icon */}
                <div className="relative mx-auto mb-6 h-20 w-20">
                  <motion.div
                    className="absolute inset-0 flex items-center justify-center rounded-full"
                    style={{
                      background:
                        "radial-gradient(circle, rgba(239,68,68,0.1) 0%, rgba(239,68,68,0.02) 70%, transparent 100%)",
                    }}
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                  >
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ duration: 0.4, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
                    >
                      <XCircle className="h-12 w-12 text-red-500/80" />
                    </motion.div>
                  </motion.div>
                </div>

                <motion.h1
                  className="font-serif text-[1.85rem] sm:text-[2.1rem] font-semibold tracking-[0.01em] text-white"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.3 }}
                >
                  Verification Failed
                </motion.h1>
                <motion.p
                  className="mt-3 text-sm font-light leading-relaxed text-white/40 max-w-md mx-auto"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.5, delay: 0.4 }}
                >
                  {result?.error || "This product could not be verified."}
                </motion.p>
                <motion.p
                  className="mt-2 text-[12px] text-white/25"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.5, delay: 0.5 }}
                >
                  If you believe this is an error, please contact our customer support.
                </motion.p>

                {/* Decorative divider */}
                <motion.div
                  className="mx-auto mt-5 flex items-center justify-center gap-2.5"
                  initial={{ opacity: 0, scaleX: 0 }}
                  animate={{ opacity: 1, scaleX: 1 }}
                  transition={{ duration: 0.6, delay: 0.5 }}
                >
                  <div className="h-px w-10 bg-gradient-to-r from-transparent to-red-500/15" />
                  <div className="h-1 w-1 rounded-full bg-red-500/25" />
                  <div className="h-px w-10 bg-gradient-to-l from-transparent to-red-500/15" />
                </motion.div>
              </motion.div>

              <motion.div
                variants={fadeUp}
                initial="hidden"
                animate="visible"
                custom={0.4}
                className="flex justify-center pt-2"
              >
                <Link
                  href="/"
                  className="group inline-flex items-center gap-2.5 rounded-xl border border-white/[0.08] bg-white/[0.03] px-7 py-3 text-[13px] font-medium text-white/60 transition-all duration-300 hover:border-white/[0.15] hover:text-white hover:bg-white/[0.06]"
                >
                  <ArrowLeft className="h-4 w-4 transition-transform duration-300 group-hover:-translate-x-0.5" />
                  Back to Home
                </Link>
              </motion.div>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}
