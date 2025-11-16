"use client";

import { motion } from "framer-motion";
import { CheckCircle2, XCircle, MapPin, Calendar, ScanLine } from "lucide-react";

interface VerificationResultProps {
  data: {
    weight: string;
    purity: string;
    serialNumber: string;
    productName: string;
    firstScanned?: string;
    totalScans: number;
    locations?: Array<{ city: string; country: string }>;
    isAuthentic: boolean;
  };
}

export function VerificationResult({ data }: VerificationResultProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-white/5 via-white/[0.03] to-transparent p-10 backdrop-blur-xl shadow-[0_20px_70px_-30px_rgba(0,0,0,0.7)]"
    >
      <div className="absolute inset-0 bg-gradient-to-br from-luxury-gold/10 via-transparent to-transparent" />

      <div className="relative z-10">
        {/* Status Badge */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
          className={`mb-6 inline-flex items-center gap-2 rounded-full px-5 py-2.5 ${
            data.isAuthentic
              ? "bg-green-500/20 border border-green-500/50 text-green-300"
              : "bg-red-500/20 border border-red-500/50 text-red-300"
          }`}
        >
          {data.isAuthentic ? (
            <CheckCircle2 className="h-5 w-5" />
          ) : (
            <XCircle className="h-5 w-5" />
          )}
          <span className="font-semibold">
            {data.isAuthentic ? "Authenticated" : "Not Authentic"}
          </span>
        </motion.div>

        {/* Product Name */}
        <h2 className="mb-2 font-sans text-3xl font-bold text-white">{data.productName}</h2>
        <p className="mb-8 text-sm uppercase tracking-[0.2em] text-white/60">{data.serialNumber}</p>

        {/* Specifications Grid */}
        <div className="mb-8 grid gap-4 sm:grid-cols-2">
          <div className="rounded-xl border border-white/10 bg-gradient-to-br from-white/10 via-white/[0.03] to-transparent p-5 backdrop-blur-sm">
            <p className="mb-1 text-xs uppercase tracking-[0.15em] text-white/50">Weight</p>
            <p className="font-sans text-xl font-bold text-luxury-gold">{data.weight}</p>
          </div>

          <div className="rounded-xl border border-white/10 bg-gradient-to-br from-white/10 via-white/[0.03] to-transparent p-5 backdrop-blur-sm">
            <p className="mb-1 text-xs uppercase tracking-[0.15em] text-white/50">Purity</p>
            <p className="font-sans text-xl font-bold text-luxury-gold">{data.purity}</p>
          </div>

          {data.firstScanned && (
            <div className="rounded-xl border border-white/10 bg-gradient-to-br from-white/10 via-white/[0.03] to-transparent p-5 backdrop-blur-sm">
              <div className="mb-1 flex items-center gap-2">
                <Calendar className="h-4 w-4 text-white/50" />
                <p className="text-xs uppercase tracking-[0.15em] text-white/50">First Scanned</p>
              </div>
              <p className="font-sans text-lg font-semibold text-white">{data.firstScanned}</p>
            </div>
          )}

          <div className="rounded-xl border border-white/10 bg-gradient-to-br from-white/10 via-white/[0.03] to-transparent p-5 backdrop-blur-sm">
            <div className="mb-1 flex items-center gap-2">
              <ScanLine className="h-4 w-4 text-white/50" />
              <p className="text-xs uppercase tracking-[0.15em] text-white/50">Total Scans</p>
            </div>
            <p className="font-sans text-lg font-semibold text-white">{data.totalScans}</p>
          </div>
        </div>

        {/* Locations */}
        {data.locations && data.locations.length > 0 && (
          <div className="rounded-xl border border-white/10 bg-gradient-to-br from-white/10 via-white/[0.03] to-transparent p-5 backdrop-blur-sm">
            <div className="mb-3 flex items-center gap-2">
              <MapPin className="h-4 w-4 text-white/50" />
              <p className="text-xs uppercase tracking-[0.15em] text-white/50">Scan Locations</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {data.locations.map((loc, idx) => (
                <span
                  key={idx}
                  className="rounded-full bg-white/10 px-3 py-1 text-sm text-white/80"
                >
                  {loc.city}, {loc.country}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}

