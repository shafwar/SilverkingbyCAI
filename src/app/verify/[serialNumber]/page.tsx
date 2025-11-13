"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { motion } from "framer-motion";
import Link from "next/link";
import Navbar from "@/components/layout/Navbar";
import { Shield, CheckCircle2, XCircle } from "lucide-react";

interface VerificationResult {
  verified: boolean;
  product?: {
    name: string;
    weight: string;
    purity: number;
    serialNumber: string;
    uniqueCode: string;
    createdAt: string;
  };
  error?: string;
}

export default function VerifyPage() {
  const params = useParams();
  const serialNumber = params.serialNumber as string;
  const [result, setResult] = useState<VerificationResult | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function verifyProduct() {
      try {
        const response = await fetch(`/api/products/verify/${serialNumber}`);
        const data = await response.json();
        setResult(data);
      } catch (error) {
        console.error("Verification error:", error);
        setResult({
          verified: false,
          error: "Failed to verify product. Please try again.",
        });
      } finally {
        setLoading(false);
      }
    }

    if (serialNumber) {
      verifyProduct();
    }
  }, [serialNumber]);

  const getWeightLabel = (weight: string) => {
    const weightMap: { [key: string]: string } = {
      FIVE_GR: "5gr",
      TEN_GR: "10gr",
      TWENTY_FIVE_GR: "25gr",
      FIFTY_GR: "50gr",
      HUNDRED_GR: "100gr",
      TWO_FIFTY_GR: "250gr",
      FIVE_HUNDRED_GR: "500gr",
    };
    return weightMap[weight] || weight;
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
                      {getWeightLabel(result.product?.weight || "")}
                    </span>
                  </div>
                  <div className="flex justify-between py-3 border-b border-luxury-silver/10">
                    <span className="text-luxury-silver">Purity</span>
                    <span className="text-luxury-lightSilver font-semibold">
                      {result.product?.purity}%
                    </span>
                  </div>
                  <div className="flex justify-between py-3 border-b border-luxury-silver/10">
                    <span className="text-luxury-silver">Serial Number</span>
                    <span className="text-luxury-lightSilver font-mono font-semibold text-sm">
                      {result.product?.serialNumber}
                    </span>
                  </div>
                  <div className="flex justify-between py-3 border-b border-luxury-silver/10">
                    <span className="text-luxury-silver">Manufacturing Date</span>
                    <span className="text-luxury-lightSilver font-semibold">
                      {new Date(result.product?.createdAt || "").toLocaleDateString()}
                    </span>
                  </div>
                  <div className="pt-4">
                    <p className="text-center text-luxury-gold italic font-serif text-lg">
                      "{result.product?.uniqueCode}"
                    </p>
                  </div>
                </div>
              </div>

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

