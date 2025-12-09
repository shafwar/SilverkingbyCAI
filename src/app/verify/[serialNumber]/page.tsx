"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { motion } from "framer-motion";
import Link from "next/link";
import Navbar from "@/components/layout/Navbar";
import { Shield, CheckCircle2, XCircle } from "lucide-react";

interface VerificationResult {
  verified: boolean;
  requiresRootKey?: boolean; // Flag for Page 2 two-step verification
  product?: {
    name: string;
    weight: number;
    serialCode: string;
    actualSerialCode?: string; // For Page 2: actual SKP serial code
    price?: number | null;
    stock?: number | null;
    qrImageUrl?: string;
    createdAt: string;
  };
  error?: string;
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
    let isMounted = true; // Prevent state updates if component unmounts

    async function verifyProduct() {
      try {
        // SECURITY: Normalize and validate serial number input
        // Remove any potentially malicious characters
        const normalizedSerial =
          serialNumber
            ?.trim()
            .toUpperCase()
            .replace(/[^A-Z0-9]/g, "") || "";

        // SECURITY: Validate serial number format and length
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

        // OPTIMIZATION: Add timeout to prevent hanging requests
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

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

        // SECURITY: Validate response structure
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

        // SECURITY: Validate product data if verified
        if (data.verified && data.product) {
          // Ensure product has required fields
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
        // Handle abort (timeout) gracefully
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

    // Cleanup: Prevent state updates if component unmounts
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
      // For gram products with root key verification:
      // - When user scans QR with uniqCode (GK...), API returns product.serialCode = uniqCode
      // - We need to use the original uniqCode from the QR scan (serialNumber param)
      // - Or use product.serialCode if it's actually the uniqCode
      const uniqCodeForVerification = result?.requiresRootKey
        ? serialNumber // Use the original QR scan uniqCode
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

      // Root key verified successfully, redirect to serial code verification page
      if (data.serialCode) {
        console.log("[VerifyPage] Root key verified, redirecting to:", data.serialCode);
        // Use router.push for better Next.js navigation
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

  return (
    <div className="min-h-screen bg-luxury-black">
      {/* Navbar */}
      <Navbar />

      {/* Content */}
      <div className="pt-32 pb-20 px-4">
        <div className="max-w-3xl mx-auto">
          {loading ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="luxury-card text-center"
            >
              <div className="animate-spin rounded-full h-16 w-16 border-4 border-luxury-gold border-t-transparent mx-auto mb-4"></div>
              <p className="text-luxury-silver text-lg">Verifying product...</p>
            </motion.div>
          ) : result?.verified ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="space-y-6"
            >
              {/* Show product info first */}
              <div className="luxury-card text-center">
                <CheckCircle2 className="w-20 h-20 text-green-500 mx-auto mb-4" />
                <h1 className="text-3xl md:text-4xl font-serif font-bold text-luxury-gold mb-3">
                  Product Verified
                </h1>
                <p className="text-luxury-silver text-lg">
                  This product is officially verified by Silver King by CAI
                </p>
              </div>

              <div className="luxury-card">
                <h2 className="text-2xl font-serif font-bold text-luxury-gold mb-6 flex items-center gap-2">
                  <Shield className="w-6 h-6" />
                  Product Information
                </h2>
                <div className="space-y-4">
                  <div className="flex justify-between py-3 border-b border-luxury-silver/10">
                    <span className="text-luxury-silver">Product Name</span>
                    <span className="text-luxury-lightSilver font-semibold">
                      {result.product?.name}
                    </span>
                  </div>
                  <div className="flex justify-between py-3 border-b border-luxury-silver/10">
                    <span className="text-luxury-silver">Weight</span>
                    <span className="text-luxury-lightSilver font-semibold">
                      {getWeightLabel(result.product?.weight)}
                    </span>
                  </div>
                  {typeof result.product?.stock === "number" && (
                    <div className="flex justify-between py-3 border-b border-luxury-silver/10">
                      <span className="text-luxury-silver">Quantity</span>
                      <span className="text-luxury-lightSilver font-semibold">
                        {result.product.stock} pcs
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between py-3 border-b border-luxury-silver/10">
                    <span className="text-luxury-silver">Manufacturing Date</span>
                    <span className="text-luxury-lightSilver font-semibold">
                      {new Date(result.product?.createdAt || "").toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>

              {/* Root Key Verification Section (Page 2 only) */}
              {result.requiresRootKey && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.2 }}
                  className="luxury-card"
                >
                  <div className="mb-4 rounded-lg border border-yellow-500/30 bg-yellow-500/10 p-4">
                    <p className="text-yellow-400 text-sm font-semibold mb-2">
                      ⚠️ Two-Step Verification Required
                    </p>
                    <p className="text-luxury-silver text-sm">
                      Please enter the root key (3-4 alphanumeric characters) provided by your
                      administrator to verify the specific SKP serial number.
                    </p>
                  </div>
                  <form onSubmit={handleRootKeySubmit} className="space-y-4">
                    <div>
                      <label className="block text-luxury-silver text-sm font-semibold mb-2">
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
                        className="w-full rounded-lg border border-luxury-silver/20 bg-luxury-black/50 px-4 py-3 text-luxury-lightSilver font-mono text-lg tracking-wider uppercase focus:border-luxury-gold focus:outline-none focus:ring-2 focus:ring-luxury-gold/20"
                        disabled={verifyingRootKey}
                      />
                      {rootKeyError && (
                        <div className="mt-2 space-y-1">
                          <p className="text-red-400 text-sm">{rootKeyError}</p>
                          {result?.product?.actualSerialCode && (
                            <p className="text-yellow-400 text-xs">
                              💡 Tip: Make sure you're using the root key for serial code{" "}
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
                      className="w-full luxury-button disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {verifyingRootKey ? "Verifying..." : "Verify Root Key"}
                    </button>
                  </form>
                </motion.div>
              )}

              {/* Show serial code only if root key verification is not required or completed */}
              {!result.requiresRootKey && (
                <div className="luxury-card">
                  <div className="flex justify-between py-3 border-b border-luxury-silver/10">
                    <span className="text-luxury-silver">Serial Number</span>
                    <span className="text-luxury-lightSilver font-mono font-semibold text-sm">
                      {result.product?.serialCode}
                    </span>
                  </div>
                  {typeof result.product?.price === "number" && (
                    <div className="flex justify-between py-3 border-b border-luxury-silver/10">
                      <span className="text-luxury-silver">Price</span>
                      <span className="text-luxury-lightSilver font-semibold">
                        Rp {result.product.price.toLocaleString("id-ID")}
                      </span>
                    </div>
                  )}
                </div>
              )}

              <div className="text-center">
                <Link href="/" className="luxury-button inline-block">
                  Back to Home
                </Link>
              </div>
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="luxury-card text-center"
            >
              <XCircle className="w-20 h-20 text-red-500 mx-auto mb-4" />
              <h1 className="text-3xl md:text-4xl font-serif font-bold text-red-500 mb-3">
                Verification Failed
              </h1>
              <p className="text-luxury-silver text-lg mb-6">
                {result?.error || "This product could not be verified."}
              </p>
              <p className="text-luxury-silver/70 mb-8">
                If you believe this is an error, please contact our customer support.
              </p>
              <Link href="/" className="luxury-button inline-block">
                Back to Home
              </Link>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}
