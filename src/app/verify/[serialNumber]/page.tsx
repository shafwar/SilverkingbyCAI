"use client";

import { useEffect, useState } from "react";
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
  Hash,
  Calendar,
  Layers,
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

function InfoRow({
  icon: Icon,
  label,
  value,
  mono,
  delay = 0,
}: {
  icon: any;
  label: string;
  value: string;
  mono?: boolean;
  delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
      className="group flex items-center justify-between gap-4 py-4 border-b border-white/[0.06] last:border-0 transition-colors duration-200 hover:bg-white/[0.015] -mx-5 px-5 rounded-lg"
    >
      <div className="flex items-center gap-3 min-w-0">
        <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-white/[0.04]">
          <Icon className="h-3.5 w-3.5 text-luxury-gold/60" />
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
            setResult({ verified: false, error: "Invalid serial number format" });
            setLoading(false);
          }
          return;
        }

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);

        const response = await fetch(`/api/verify/${encodeURIComponent(normalizedSerial)}`, {
          method: "GET",
          headers: { "Content-Type": "application/json" },
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
            setResult({ verified: false, error: "Invalid response from server" });
            setLoading(false);
          }
          return;
        }

        if (data.verified && data.product) {
          if (!data.product.serialCode || !data.product.name) {
            if (isMounted) {
              setResult({ verified: false, error: "Invalid product data received" });
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
            setResult({ verified: false, error: "Request timeout. Please try again." });
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
      setResult({ verified: false, error: "Serial number is required" });
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

      const response = await fetch("/api/verify/root-key", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          uniqCode: uniqCodeForVerification,
          rootKey: rootKey.trim().toUpperCase(),
        }),
      });

      let data;
      try {
        data = await response.json();
      } catch {
        setRootKeyError("Server error. Please try again.");
        setVerifyingRootKey(false);
        return;
      }

      if (!response.ok || !data.verified) {
        setRootKeyError(
          data.error || `Verification failed (${response.status}). Please try again.`
        );
        setVerifyingRootKey(false);
        return;
      }

      if (data.serialCode) {
        window.location.href = `/verify/${encodeURIComponent(data.serialCode)}`;
      } else {
        setRootKeyError(
          "Verification successful but serial code not found. Please contact support."
        );
        setVerifyingRootKey(false);
      }
    } catch {
      setRootKeyError("Failed to verify root key. Please try again.");
      setVerifyingRootKey(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#060606]">
      <Navbar />

      {/* Background accents */}
      <div className="pointer-events-none fixed inset-0 z-0">
        <div
          className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] opacity-40"
          style={{
            background:
              "radial-gradient(ellipse at center, rgba(212,175,55,0.06) 0%, transparent 65%)",
            filter: "blur(60px)",
          }}
        />
      </div>

      {/* Content */}
      <div className="relative z-10 pt-28 pb-20 px-4 sm:px-6">
        <div className="max-w-2xl mx-auto">
          {loading ? (
            /* Loading state */
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center justify-center py-32"
            >
              <div className="relative">
                <div className="h-14 w-14 rounded-full border-2 border-luxury-gold/20" />
                <div className="absolute inset-0 h-14 w-14 rounded-full border-2 border-transparent border-t-luxury-gold animate-spin" />
              </div>
              <p className="mt-5 text-sm text-white/40 tracking-wide">Verifying product...</p>
            </motion.div>
          ) : result?.requiresRootKey ? (
            /* Root key required */
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="space-y-5"
            >
              {/* Header card */}
              <div className="relative overflow-hidden rounded-2xl border border-white/[0.07] bg-white/[0.025] p-8 text-center backdrop-blur-sm">
                <div className="absolute top-0 inset-x-8 h-px bg-gradient-to-r from-transparent via-luxury-gold/30 to-transparent" />
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-luxury-gold/20 bg-luxury-gold/[0.08]">
                  <KeyRound className="h-7 w-7 text-luxury-gold" />
                </div>
                <h1 className="font-serif text-2xl font-semibold tracking-wide text-white">
                  Root Key Required
                </h1>
                <p className="mt-2 text-sm text-white/40 max-w-md mx-auto leading-relaxed">
                  Enter the root key to complete verification for this product
                </p>
              </div>

              {/* Product info */}
              <div className="rounded-2xl border border-white/[0.07] bg-white/[0.025] px-5 py-2 backdrop-blur-sm">
                {result.product?.name && (
                  <InfoRow icon={Package} label="Product Name" value={result.product.name} delay={0.1} />
                )}
                <InfoRow icon={Scale} label="Weight" value={getWeightLabel(result.product?.weight)} delay={0.15} />
                {typeof result.product?.stock === "number" && (
                  <InfoRow icon={Layers} label="Quantity" value={`${result.product.stock} pcs`} delay={0.2} />
                )}
                <InfoRow
                  icon={Calendar}
                  label="Manufacturing Date"
                  value={new Date(result.product?.createdAt || "").toLocaleDateString()}
                  delay={0.25}
                />
              </div>

              {/* Root key form */}
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-6 backdrop-blur-sm"
              >
                <div className="mb-5 rounded-xl border border-amber-500/15 bg-amber-500/[0.04] px-4 py-3.5">
                  <p className="text-amber-400/90 text-[13px] font-semibold mb-1">
                    Two-Step Verification
                  </p>
                  <p className="text-white/35 text-[12px] leading-relaxed">
                    Enter the root key (3-4 alphanumeric characters) from your administrator.
                  </p>
                </div>
                <form onSubmit={handleRootKeySubmit} className="space-y-4">
                  <div>
                    <input
                      type="text"
                      value={rootKey}
                      onChange={(e) => {
                        setRootKey(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""));
                        setRootKeyError(null);
                      }}
                      maxLength={4}
                      placeholder="e.g., A1H2"
                      className="w-full rounded-xl border border-white/[0.1] bg-white/[0.03] px-5 py-4 text-white font-mono text-lg tracking-[0.15em] text-center uppercase placeholder:text-white/20 focus:border-luxury-gold/40 focus:outline-none focus:ring-1 focus:ring-luxury-gold/15 transition-all duration-300"
                      disabled={verifyingRootKey}
                    />
                    {rootKeyError && (
                      <div className="mt-3 space-y-1">
                        <p className="text-red-400/80 text-[12px]">{rootKeyError}</p>
                        {result?.product?.actualSerialCode && (
                          <p className="text-amber-400/70 text-[11px]">
                            Tip: Use the root key for{" "}
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
                    className="group relative w-full overflow-hidden rounded-xl py-4 text-[13px] font-bold tracking-[0.06em] uppercase text-black transition-all duration-300 disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.98]"
                    style={{
                      background: "linear-gradient(135deg, #B8960E 0%, #D4AF37 25%, #FFD700 55%, #E8C84A 80%, #D4AF37 100%)",
                      boxShadow: "0 6px 24px -6px rgba(212,175,55,0.3)",
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
            /* Verified */
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="space-y-5"
            >
              {/* Success header */}
              <div className="relative overflow-hidden rounded-2xl border border-white/[0.07] bg-white/[0.025] py-12 px-8 text-center backdrop-blur-sm">
                {/* Top gold accent */}
                <div className="absolute top-0 inset-x-8 h-px bg-gradient-to-r from-transparent via-emerald-500/30 to-transparent" />

                {/* Animated check icon */}
                <motion.div
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ duration: 0.5, delay: 0.15, type: "spring", stiffness: 200 }}
                  className="relative mx-auto mb-6"
                >
                  <div className="relative flex h-20 w-20 mx-auto items-center justify-center">
                    {/* Glow ring */}
                    <div className="absolute inset-0 rounded-full bg-emerald-500/10 blur-xl" />
                    {/* Outer ring */}
                    <div className="absolute inset-0 rounded-full border-2 border-emerald-500/20" />
                    {/* Icon */}
                    <CheckCircle2 className="relative h-10 w-10 text-emerald-400" />
                  </div>
                </motion.div>

                <motion.h1
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.3 }}
                  className="font-serif text-3xl font-semibold tracking-wide text-white"
                >
                  Product Verified
                </motion.h1>
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.4, delay: 0.4 }}
                  className="mt-3 text-sm text-white/40 leading-relaxed max-w-md mx-auto"
                >
                  This product is officially verified by Silver King by CAI
                </motion.p>

                {/* Decorative divider */}
                <div className="mt-6 flex items-center justify-center gap-2.5">
                  <div className="h-px w-10 bg-gradient-to-r from-transparent to-white/10" />
                  <div className="h-1 w-1 rounded-full bg-emerald-500/40" />
                  <div className="h-px w-10 bg-gradient-to-l from-transparent to-white/10" />
                </div>
              </div>

              {/* Product information */}
              <div className="rounded-2xl border border-white/[0.07] bg-white/[0.025] backdrop-blur-sm overflow-hidden">
                <div className="px-5 pt-5 pb-2 flex items-center gap-2.5">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-luxury-gold/[0.08]">
                    <Shield className="h-3.5 w-3.5 text-luxury-gold/70" />
                  </div>
                  <h2 className="text-[13px] font-semibold uppercase tracking-[0.2em] text-luxury-gold/60">
                    Product Information
                  </h2>
                </div>
                <div className="px-5 py-1">
                  {result.product?.name && (
                    <InfoRow icon={Package} label="Product Name" value={result.product.name} delay={0.35} />
                  )}
                  <InfoRow icon={Scale} label="Weight" value={getWeightLabel(result.product?.weight)} delay={0.4} />
                  {typeof result.product?.stock === "number" && (
                    <InfoRow icon={Layers} label="Quantity" value={`${result.product.stock} pcs`} delay={0.45} />
                  )}
                  <InfoRow
                    icon={Calendar}
                    label="Manufacturing Date"
                    value={new Date(result.product?.createdAt || "").toLocaleDateString()}
                    delay={0.5}
                  />
                </div>
              </div>

              {/* Serial & price */}
              {!result.requiresRootKey && (
                <div className="rounded-2xl border border-white/[0.07] bg-white/[0.025] px-5 py-1 backdrop-blur-sm">
                  <InfoRow icon={Hash} label="Serial Number" value={result.product?.serialCode || "—"} mono delay={0.55} />
                  {typeof result.product?.price === "number" && (
                    <InfoRow
                      icon={Banknote}
                      label="Price"
                      value={`Rp ${result.product.price.toLocaleString("id-ID")}`}
                      delay={0.6}
                    />
                  )}
                </div>
              )}

              {/* Back to home */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.65 }}
                className="pt-2 text-center"
              >
                <Link
                  href="/"
                  className="group inline-flex items-center gap-2 rounded-xl border border-white/[0.1] bg-white/[0.03] px-7 py-3.5 text-[13px] font-semibold text-white/70 transition-all duration-300 hover:border-white/[0.2] hover:bg-white/[0.06] hover:text-white"
                >
                  <ArrowLeft className="h-4 w-4 transition-transform duration-300 group-hover:-translate-x-0.5" />
                  Back to Home
                </Link>
              </motion.div>
            </motion.div>
          ) : (
            /* Not verified / error */
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="space-y-5"
            >
              <div className="relative overflow-hidden rounded-2xl border border-white/[0.07] bg-white/[0.025] py-12 px-8 text-center backdrop-blur-sm">
                <div className="absolute top-0 inset-x-8 h-px bg-gradient-to-r from-transparent via-red-500/20 to-transparent" />
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ duration: 0.5, delay: 0.1, type: "spring", stiffness: 200 }}
                  className="relative mx-auto mb-6"
                >
                  <div className="relative flex h-20 w-20 mx-auto items-center justify-center">
                    <div className="absolute inset-0 rounded-full bg-red-500/10 blur-xl" />
                    <div className="absolute inset-0 rounded-full border-2 border-red-500/20" />
                    <XCircle className="relative h-10 w-10 text-red-400" />
                  </div>
                </motion.div>
                <h1 className="font-serif text-3xl font-semibold tracking-wide text-white">
                  Verification Failed
                </h1>
                <p className="mt-3 text-sm text-white/40 max-w-md mx-auto leading-relaxed">
                  {result?.error || "This product could not be verified."}
                </p>
                <p className="mt-2 text-[12px] text-white/25 max-w-sm mx-auto">
                  If you believe this is an error, please contact our customer support.
                </p>

                <div className="mt-8">
                  <Link
                    href="/"
                    className="group inline-flex items-center gap-2 rounded-xl border border-white/[0.1] bg-white/[0.03] px-7 py-3.5 text-[13px] font-semibold text-white/70 transition-all duration-300 hover:border-white/[0.2] hover:bg-white/[0.06] hover:text-white"
                  >
                    <ArrowLeft className="h-4 w-4 transition-transform duration-300 group-hover:-translate-x-0.5" />
                    Back to Home
                  </Link>
                </div>
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}
