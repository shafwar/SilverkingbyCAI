"use client";

import { useEffect, useState, useMemo, useRef } from "react";
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
import { VERIFIED_BG_IMAGES } from "@/assets/verified-bg";
import { getR2UrlClient } from "@/utils/r2-url";

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
  bold,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  mono?: boolean;
  bold?: boolean;
}) {
  return (
    <motion.div
      variants={rowReveal}
      className={`flex items-center justify-between gap-4 py-4 border-b last:border-b-0 ${
        bold ? "border-white/20" : "border-white/[0.06]"
      }`}
    >
      <div className="flex items-center gap-3 min-w-0">
        <div
          className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg ${
            bold ? "bg-white/10" : "bg-white/[0.04]"
          }`}
        >
          <Icon className={`h-4 w-4 ${bold ? "text-luxury-gold" : "text-luxury-gold/60"}`} />
        </div>
        <span
          className={
            bold
              ? "text-[13px] font-semibold text-white/95"
              : "text-[13px] text-white/45 font-medium"
          }
        >
          {label}
        </span>
      </div>
      <span
        className={`text-right truncate ${
          bold ? "text-[14px] font-bold text-white" : "text-[14px] font-semibold text-white"
        } ${mono ? "font-mono tracking-wide text-[13px]" : ""}`}
      >
        {value}
      </span>
    </motion.div>
  );
}

function VerifiedBackgroundSvg({ seed }: { seed: string }) {
  const s = seed.slice(0, 10);
  return (
    <svg
      className="pointer-events-none fixed inset-0 z-0 h-screen w-screen"
      aria-hidden
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 1600 900"
      preserveAspectRatio="xMidYMid slice"
    >
      <defs>
        <linearGradient id="verify_g1" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#050505" />
          <stop offset="0.55" stopColor="#0b0b0b" />
          <stop offset="1" stopColor="#050505" />
        </linearGradient>
        <radialGradient id="verify_glow" cx="50%" cy="18%" r="62%">
          <stop offset="0" stopColor="#22c55e" stopOpacity="0.12" />
          <stop offset="0.55" stopColor="#d4af37" stopOpacity="0.08" />
          <stop offset="1" stopColor="#000000" stopOpacity="0" />
        </radialGradient>
        <filter id="verify_noise">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.9"
            numOctaves="2"
            stitchTiles="stitch"
            seed="7"
          />
          <feColorMatrix
            type="matrix"
            values="
              0 0 0 0 0.60
              0 0 0 0 0.52
              0 0 0 0 0.10
              0 0 0 0.18 0
            "
          />
        </filter>
        <filter id="verify_blur">
          <feGaussianBlur stdDeviation="22" />
        </filter>
      </defs>
      <rect width="1600" height="900" fill="url(#verify_g1)" />
      <rect width="1600" height="900" fill="url(#verify_glow)" />
      <g opacity="0.55" filter="url(#verify_blur)">
        <circle cx="240" cy="760" r="220" fill="#d4af37" fillOpacity="0.10" />
        <circle cx="1340" cy="720" r="260" fill="#22c55e" fillOpacity="0.08" />
        <circle cx="860" cy="130" r="220" fill="#d4af37" fillOpacity="0.06" />
      </g>
      <rect width="1600" height="900" filter="url(#verify_noise)" opacity="0.9" />
      <text
        x="1500"
        y="860"
        textAnchor="end"
        fontFamily="ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace"
        fontSize="18"
        fill="#ffffff"
        opacity="0.06"
      >
        {s}
      </text>
    </svg>
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

  /** Guaranteed pool: static URLs always included so we never have empty; try next on error until one loads. */
  const staticUrls = useMemo(
    () => VERIFIED_BG_IMAGES.map((p) => getR2UrlClient(p)),
    []
  );

  const [verifiedBgDisplayUrl, setVerifiedBgDisplayUrl] = useState<string | null>(null);
  const [verifiedBgError, setVerifiedBgError] = useState(false);
  const verifiedBgFallbackUrls = useRef<string[]>([]);
  const preloadSeqIdRef = useRef(0);
  const currentVerifiedBgUrlRef = useRef<string | null>(null);

  useEffect(() => {
    if (!result?.verified) {
      setVerifiedBgDisplayUrl(null);
      setVerifiedBgError(false);
      verifiedBgFallbackUrls.current = [];
      return;
    }
    // Show first static image immediately so something appears 100% while API runs
    const firstStatic = staticUrls[0];
    currentVerifiedBgUrlRef.current = firstStatic;
    setVerifiedBgDisplayUrl(firstStatic);
    setVerifiedBgError(false);
    verifiedBgFallbackUrls.current = staticUrls.slice(1);

    const mySeq = ++preloadSeqIdRef.current;
    const preloadAndSwap = async (pool: string[]) => {
      const seen = new Set<string>();
      const ordered = pool.filter((u) => (u ? !seen.has(u) && (seen.add(u), true) : false));
      // Try all candidates sequentially; swap only when a candidate fully loads.
      for (const url of ordered) {
        if (preloadSeqIdRef.current !== mySeq) return;
        // Skip if already showing this URL
        if (url === currentVerifiedBgUrlRef.current) continue;
        try {
          await new Promise<void>((resolve, reject) => {
            const img = new window.Image();
            const t = window.setTimeout(() => reject(new Error("timeout")), 8000);
            img.onload = () => {
              window.clearTimeout(t);
              resolve();
            };
            img.onerror = () => {
              window.clearTimeout(t);
              reject(new Error("error"));
            };
            img.decoding = "async";
            img.src = url;
          });
          if (preloadSeqIdRef.current !== mySeq) return;
          currentVerifiedBgUrlRef.current = url;
          setVerifiedBgDisplayUrl(url);
          setVerifiedBgError(false);
          verifiedBgFallbackUrls.current = ordered.filter((u) => u !== url);
          return;
        } catch {
          // try next
        }
      }
    };

    // Preload static candidates immediately (in case firstStatic is slow/blocked)
    void preloadAndSwap(staticUrls);

    let cancelled = false;
    fetch("/api/verified-bg-images")
      .then((r) => r.json())
      .then((data: { urls?: string[] }) => {
        if (cancelled) return;
        const apiList = Array.isArray(data?.urls) ? data.urls.filter((u) => u && u.startsWith("http")) : [];
        const seen = new Set<string>();
        const merged: string[] = [];
        for (const u of [...apiList, ...staticUrls]) {
          if (u && !seen.has(u)) {
            seen.add(u);
            merged.push(u);
          }
        }
        if (merged.length === 0) return;
        // Shuffle so the background varies, but we still try all.
        const shuffled = merged
          .map((u) => ({ u, r: Math.random() }))
          .sort((a, b) => a.r - b.r)
          .map((x) => x.u);
        void preloadAndSwap(shuffled);
      })
      .catch(() => {
        if (cancelled) return;
        // static preload already running; nothing else to do
      });
    return () => {
      cancelled = true;
    };
  }, [result?.verified, staticUrls]);

  const effectiveVerifiedBgUrl = verifiedBgDisplayUrl;

  const handleVerifiedBgError = () => {
    const fallbacks = verifiedBgFallbackUrls.current;
    if (fallbacks.length > 0) {
      verifiedBgFallbackUrls.current = fallbacks.slice(1);
      setVerifiedBgDisplayUrl(fallbacks[0]);
    } else {
      setVerifiedBgError(true);
    }
  };

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

  const showVerifiedBackground = Boolean(result?.verified && !result?.requiresRootKey);

  const showRootKeyMode = Boolean(result?.requiresRootKey);

  return (
    <div
      className={`min-h-screen text-white ${
        showRootKeyMode
          ? "bg-gradient-to-b from-[#141414] via-[#101010] to-[#0a0a0a]"
          : "bg-[#050505]"
      }`}
    >
      {/* Background only when product is verified (not on root-key input screen). */}
      {showVerifiedBackground && (
        <>
          <VerifiedBackgroundSvg seed={serialNumber || "SK"} />

          {!verifiedBgError && effectiveVerifiedBgUrl ? (
            <div
              key={effectiveVerifiedBgUrl}
              className="pointer-events-none fixed inset-0 z-[1] overflow-hidden bg-[#0a0a0a]"
              aria-hidden
            >
              {/* Use a real <img> (not CSS background-image) for deterministic loading + onError across browsers */}
              <img
                key={effectiveVerifiedBgUrl}
                src={effectiveVerifiedBgUrl}
                alt=""
                className="absolute inset-0 h-full w-full object-cover"
                loading="eager"
                decoding="async"
                onError={handleVerifiedBgError}
                aria-hidden
                fetchPriority="high"
              />
            </div>
          ) : !verifiedBgError ? null : (
            <div
              className="pointer-events-none fixed inset-0 z-[1] bg-[#0a0a0a]"
              style={{
                background:
                  "linear-gradient(180deg, rgba(0,0,0,0.88) 0%, rgba(0,0,0,0.78) 50%, rgba(0,0,0,0.9) 100%)",
              }}
              aria-hidden
            />
          )}
          {/* Overlay: darker so Product Verified text and table stay readable on all devices */}
          <div
            className="pointer-events-none fixed inset-0 z-[2] min-h-full"
            style={{
              background:
                "linear-gradient(180deg, rgba(0,0,0,0.70) 0%, rgba(0,0,0,0.64) 50%, rgba(0,0,0,0.74) 100%)",
            }}
            aria-hidden
          />
        </>
      )}

      {/* Background ambient — only tint when verified success; root key stays clean */}
      <div
        className="pointer-events-none fixed inset-0 z-[3]"
        style={{
          background: result?.requiresRootKey
            ? "none"
            : showVerifiedBackground
              ? "radial-gradient(ellipse 60% 40% at 50% 20%, rgba(34,197,94,0.04) 0%, transparent 60%), radial-gradient(ellipse 50% 35% at 50% 80%, rgba(212,175,55,0.03) 0%, transparent 50%)"
              : result && !result.verified && !result.requiresRootKey
                ? "radial-gradient(ellipse 60% 40% at 50% 20%, rgba(239,68,68,0.04) 0%, transparent 60%)"
                : "radial-gradient(ellipse 60% 40% at 50% 20%, rgba(212,175,55,0.04) 0%, transparent 60%)",
        }}
      />

      <Navbar />

      <div className="relative z-10 min-h-screen pt-24 pb-16 px-4 sm:pt-28 sm:pb-20 sm:px-6">
        <div className="mx-auto w-full max-w-2xl">
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
                <p className="mt-2 text-sm font-medium leading-relaxed text-white/75 max-w-md mx-auto">
                  Please enter the root key to complete verification for this product.
                </p>
              </motion.div>

              {/* Product info card */}
              <motion.div
                variants={fadeUp}
                initial="hidden"
                animate="visible"
                custom={0.1}
                className="rounded-2xl border border-white/[0.14] bg-white/[0.06] p-6 sm:p-7 shadow-2xl shadow-black/40"
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
                className="rounded-2xl border border-luxury-gold/25 bg-white/[0.06] p-6 sm:p-7 shadow-2xl shadow-black/40"
              >
                <div className="mb-5 rounded-xl border border-amber-500/20 bg-amber-500/[0.08] px-4 py-3.5">
                  <p className="text-amber-300 text-[13px] font-bold mb-1">
                    Two-Step Verification Required
                  </p>
                  <p className="text-white/75 text-[12px] leading-relaxed">
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
                      className="w-full rounded-xl border border-white/[0.20] bg-black/35 px-5 py-3.5 font-mono text-base tracking-[0.15em] text-white uppercase placeholder:text-white/40 outline-none transition-all duration-300 focus:border-luxury-gold/55 focus:ring-2 focus:ring-luxury-gold/25"
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
              {/* Success header — strong contrast so "Product Verified" never clashes with bg */}
              <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={0} className="text-center pt-2 pb-1">
                <div className="relative mx-auto mb-6 h-28 w-28 sm:h-32 sm:w-32">
                  <motion.div
                    className="absolute inset-0 rounded-full border-2 border-emerald-500/30"
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: [0.8, 1.2, 1.2], opacity: [0, 0.5, 0] }}
                    transition={{ duration: 2, repeat: Infinity, ease: "easeOut" }}
                  />
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
                      <CheckCircle2 className="h-20 w-20 sm:h-24 sm:w-24 text-emerald-500" />
                    </motion.div>
                  </motion.div>
                </div>

                {/* Title + subtitle on dark bar — readable on any background; responsive */}
                <div className="mx-auto inline-block max-w-[90vw] rounded-xl bg-black/60 px-4 py-3 shadow-lg ring-1 ring-white/10 backdrop-blur-sm sm:max-w-none sm:rounded-2xl sm:px-6 sm:py-4">
                  <motion.h1
                    className="font-serif text-[1.9rem] sm:text-[2.25rem] font-extrabold tracking-tight text-white"
                    style={{
                      textShadow:
                        "0 0 20px rgba(0,0,0,0.9), 0 2px 4px rgba(0,0,0,0.8), 0 1px 2px rgba(0,0,0,0.9)",
                    }}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
                  >
                    Product Verified
                  </motion.h1>
                  <motion.p
                    className="mt-2 text-sm font-semibold text-white/95"
                    style={{
                      textShadow: "0 1px 8px rgba(0,0,0,0.85), 0 1px 2px rgba(0,0,0,0.8)",
                    }}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.5, delay: 0.45 }}
                  >
                    This product is officially verified by Silver King by CAI
                  </motion.p>
                </div>

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

              {/* Product info card — bold panel so text is clear over background image */}
              <motion.div
                variants={fadeUp}
                initial="hidden"
                animate="visible"
                custom={0.25}
                className="rounded-2xl border-2 border-white/30 bg-black/98 shadow-2xl shadow-black/60 p-6 sm:p-7"
              >
                <div className="flex items-center gap-2.5 mb-5">
                  <Shield className="h-[18px] w-[18px] text-luxury-gold" />
                  <h2 className="text-[13px] font-bold uppercase tracking-[0.15em] text-luxury-gold">
                    Product Information
                  </h2>
                </div>
                <motion.div variants={staggerContainer} initial="hidden" animate="visible">
                  <InfoRow bold icon={Package} label="Product Name" value={result.product?.name || "—"} />
                  <InfoRow bold icon={Scale} label="Weight" value={getWeightLabel(result.product?.weight)} />
                  {typeof result.product?.stock === "number" && (
                    <InfoRow bold icon={Layers} label="Quantity" value={`${result.product.stock} pcs`} />
                  )}
                  <InfoRow
                    bold
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
                  className="rounded-2xl border-2 border-white/30 bg-black/98 shadow-2xl shadow-black/60 p-6 sm:p-7"
                >
                  <motion.div variants={staggerContainer} initial="hidden" animate="visible">
                    <InfoRow
                      bold
                      icon={Hash}
                      label="Serial Number"
                      value={result.product?.serialCode || "—"}
                      mono
                    />
                    {typeof result.product?.price === "number" && (
                      <InfoRow
                        bold
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
