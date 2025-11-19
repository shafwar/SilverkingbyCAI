"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { CheckCircle2, XCircle, MapPin, Calendar, ScanLine, X, Sparkles } from "lucide-react";

interface VerificationData {
  weight: string;
  purity: string;
  serialNumber: string;
  productName: string;
  firstScanned?: string;
  totalScans: number;
  locations?: Array<{ city: string; country: string }>;
  isAuthentic: boolean;
}

interface VerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: VerificationData | null;
  isVerifying: boolean;
}

export function VerificationModal({ isOpen, onClose, data, isVerifying }: VerificationModalProps) {
  const [showSuccessBadge, setShowSuccessBadge] = useState(false);
  const [showDetailCard, setShowDetailCard] = useState(false);
  const badgeRef = useRef<HTMLDivElement>(null);
  const sparklesRef = useRef<HTMLDivElement>(null);

  // Reset states when modal opens/closes
  useEffect(() => {
    if (isOpen && !isVerifying && data) {
      // Show success badge first
      setShowSuccessBadge(true);
      setShowDetailCard(false);
      
      // After 1.5s, hide badge and show detail card
      const timer = setTimeout(() => {
        setShowSuccessBadge(false);
        setTimeout(() => {
          setShowDetailCard(true);
        }, 300); // Small delay for smooth transition
      }, 1500);

      return () => clearTimeout(timer);
    } else {
      setShowSuccessBadge(false);
      setShowDetailCard(false);
    }
  }, [isOpen, isVerifying, data]);

  // GSAP animation for success badge
  useGSAP(
    () => {
      if (showSuccessBadge && badgeRef.current) {
        const badge = badgeRef.current;
        const sparkles = sparklesRef.current;

        // Create timeline
        const tl = gsap.timeline();

        // Badge entrance animation
        tl.fromTo(
          badge,
          {
            scale: 0,
            rotation: -180,
            opacity: 0,
          },
          {
            scale: 1,
            rotation: 0,
            opacity: 1,
            duration: 0.8,
            ease: "back.out(1.7)",
          }
        )
          // Pulse effect
          .to(badge, {
            scale: 1.1,
            duration: 0.3,
            ease: "power2.out",
          })
          .to(badge, {
            scale: 1,
            duration: 0.3,
            ease: "power2.in",
          })
          // Sparkles animation
          .to(
            sparkles?.querySelectorAll("[data-sparkle]") || [],
            {
              scale: [0, 1.5, 0],
              opacity: [0, 1, 0],
              rotation: 360,
              duration: 1.2,
              stagger: 0.1,
              ease: "power2.out",
            },
            "-=0.6"
          );
      }
    },
    { scope: badgeRef, dependencies: [showSuccessBadge] }
  );

  if (!isOpen) return null;

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key="modal-backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3 }}
        className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
        onClick={onClose}
      >
        {/* Blurred Background */}
        <motion.div
          initial={{ backdropFilter: "blur(0px)" }}
          animate={{ backdropFilter: "blur(20px)" }}
          exit={{ backdropFilter: "blur(0px)" }}
          transition={{ duration: 0.4 }}
          className="absolute inset-0 bg-black/60"
        />

        {/* Loading State */}
        {isVerifying && (
          <motion.div
            key="loading"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.3 }}
            className="relative z-10 flex flex-col items-center gap-6"
          >
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              className="h-20 w-20 rounded-full border-4 border-luxury-gold/30 border-t-luxury-gold"
            />
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-lg font-medium text-white"
            >
              Verifying authenticity...
            </motion.p>
          </motion.div>
        )}

        {/* Success Badge Animation */}
        <AnimatePresence>
          {showSuccessBadge && data && (
            <motion.div
              key="success-badge"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, scale: 0.8, y: -50 }}
              transition={{ duration: 0.3 }}
              className="relative z-10"
            >
              <div ref={badgeRef} className="relative">
                {/* Sparkles Container */}
                <div ref={sparklesRef} className="absolute inset-0 pointer-events-none">
                  {Array.from({ length: 12 }).map((_, i) => (
                    <motion.div
                      key={i}
                      data-sparkle
                      className="absolute h-2 w-2 rounded-full bg-luxury-gold"
                      style={{
                        left: `${50 + Math.cos((i * Math.PI * 2) / 12) * 80}%`,
                        top: `${50 + Math.sin((i * Math.PI * 2) / 12) * 80}%`,
                      }}
                    />
                  ))}
                </div>

                {/* Badge */}
                <motion.div
                  className={`relative flex flex-col items-center justify-center rounded-3xl border-2 p-12 backdrop-blur-xl shadow-2xl ${
                    data.isAuthentic
                      ? "border-green-500/50 bg-gradient-to-br from-green-500/20 via-green-500/10 to-transparent"
                      : "border-red-500/50 bg-gradient-to-br from-red-500/20 via-red-500/10 to-transparent"
                  }`}
                >
                  {/* Glow Effect */}
                  <motion.div
                    className={`absolute inset-0 rounded-3xl blur-2xl ${
                      data.isAuthentic ? "bg-green-500/30" : "bg-red-500/30"
                    }`}
                    animate={{
                      scale: [1, 1.2, 1],
                      opacity: [0.5, 0.8, 0.5],
                    }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      ease: "easeInOut",
                    }}
                  />

                  <motion.div
                    animate={{
                      scale: [1, 1.15, 1],
                      rotate: [0, 5, -5, 0],
                    }}
                    transition={{
                      duration: 0.6,
                      ease: "easeOut",
                    }}
                  >
                    {data.isAuthentic ? (
                      <CheckCircle2 className="h-24 w-24 text-green-400" strokeWidth={2} />
                    ) : (
                      <XCircle className="h-24 w-24 text-red-400" strokeWidth={2} />
                    )}
                  </motion.div>

                  <motion.h3
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className={`mt-6 text-2xl font-bold ${
                      data.isAuthentic ? "text-green-300" : "text-red-300"
                    }`}
                  >
                    {data.isAuthentic ? "Certified Authentic" : "Not Authentic"}
                  </motion.h3>

                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.5 }}
                    className="mt-2 text-sm text-white/60"
                  >
                    {data.productName}
                  </motion.p>
                </motion.div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Detail Card */}
        <AnimatePresence>
          {showDetailCard && data && (
            <motion.div
              key="detail-card"
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              onClick={(e) => e.stopPropagation()}
              className="relative z-10 w-full max-w-2xl"
            >
              <motion.div
                className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-white/5 via-white/[0.03] to-transparent p-8 md:p-10 backdrop-blur-xl shadow-[0_20px_70px_-30px_rgba(0,0,0,0.7)]"
                initial={{ filter: "blur(10px)" }}
                animate={{ filter: "blur(0px)" }}
                transition={{ delay: 0.2, duration: 0.4 }}
              >
                {/* Background Gradient */}
                <div className="absolute inset-0 bg-gradient-to-br from-luxury-gold/10 via-transparent to-transparent" />

                {/* Close Button */}
                <motion.button
                  whileHover={{ scale: 1.1, rotate: 90 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={onClose}
                  className="absolute top-4 right-4 z-20 rounded-full bg-black/50 p-2 text-white/80 backdrop-blur-sm transition-colors hover:bg-black/70 hover:text-white"
                >
                  <X className="h-5 w-5" />
                </motion.button>

                <div className="relative z-10">
                  {/* Header */}
                  <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="mb-8"
                  >
                    <div className="mb-4 flex items-center gap-3">
                      <motion.div
                        animate={{
                          scale: [1, 1.1, 1],
                        }}
                        transition={{
                          duration: 2,
                          repeat: Infinity,
                          ease: "easeInOut",
                        }}
                        className={`rounded-full p-2 ${
                          data.isAuthentic
                            ? "bg-green-500/20 text-green-400"
                            : "bg-red-500/20 text-red-400"
                        }`}
                      >
                        {data.isAuthentic ? (
                          <CheckCircle2 className="h-6 w-6" />
                        ) : (
                          <XCircle className="h-6 w-6" />
                        )}
                      </motion.div>
                      <div>
                        <h2 className="font-sans text-3xl font-bold text-white">{data.productName}</h2>
                        <p className="text-sm uppercase tracking-[0.2em] text-white/60">
                          {data.serialNumber}
                        </p>
                      </div>
                    </div>
                  </motion.div>

                  {/* Specifications Grid */}
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    className="mb-8 grid gap-4 sm:grid-cols-2"
                  >
                    <motion.div
                      whileHover={{ scale: 1.02, y: -2 }}
                      className="rounded-xl border border-white/10 bg-gradient-to-br from-white/10 via-white/[0.03] to-transparent p-5 backdrop-blur-sm"
                    >
                      <p className="mb-1 text-xs uppercase tracking-[0.15em] text-white/50">Weight</p>
                      <p className="font-sans text-xl font-bold text-luxury-gold">{data.weight}</p>
                    </motion.div>

                    <motion.div
                      whileHover={{ scale: 1.02, y: -2 }}
                      className="rounded-xl border border-white/10 bg-gradient-to-br from-white/10 via-white/[0.03] to-transparent p-5 backdrop-blur-sm"
                    >
                      <p className="mb-1 text-xs uppercase tracking-[0.15em] text-white/50">Purity</p>
                      <p className="font-sans text-xl font-bold text-luxury-gold">{data.purity}</p>
                    </motion.div>

                    {data.firstScanned && (
                      <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.5 }}
                        whileHover={{ scale: 1.02, y: -2 }}
                        className="rounded-xl border border-white/10 bg-gradient-to-br from-white/10 via-white/[0.03] to-transparent p-5 backdrop-blur-sm"
                      >
                        <div className="mb-1 flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-white/50" />
                          <p className="text-xs uppercase tracking-[0.15em] text-white/50">
                            First Scanned
                          </p>
                        </div>
                        <p className="font-sans text-lg font-semibold text-white">{data.firstScanned}</p>
                      </motion.div>
                    )}

                    <motion.div
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.5 }}
                      whileHover={{ scale: 1.02, y: -2 }}
                      className="rounded-xl border border-white/10 bg-gradient-to-br from-white/10 via-white/[0.03] to-transparent p-5 backdrop-blur-sm"
                    >
                      <div className="mb-1 flex items-center gap-2">
                        <ScanLine className="h-4 w-4 text-white/50" />
                        <p className="text-xs uppercase tracking-[0.15em] text-white/50">Total Scans</p>
                      </div>
                      <p className="font-sans text-lg font-semibold text-white">{data.totalScans}</p>
                    </motion.div>
                  </motion.div>

                  {/* Locations */}
                  {data.locations && data.locations.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.6 }}
                      className="rounded-xl border border-white/10 bg-gradient-to-br from-white/10 via-white/[0.03] to-transparent p-5 backdrop-blur-sm"
                    >
                      <div className="mb-3 flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-white/50" />
                        <p className="text-xs uppercase tracking-[0.15em] text-white/50">
                          Scan Locations
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {data.locations.map((loc, idx) => (
                          <motion.span
                            key={idx}
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: 0.7 + idx * 0.1 }}
                            whileHover={{ scale: 1.05 }}
                            className="rounded-full bg-white/10 px-3 py-1 text-sm text-white/80"
                          >
                            {loc.city}, {loc.country}
                          </motion.span>
                        ))}
                      </div>
                    </motion.div>
                  )}

                  {/* Decorative Sparkles */}
                  <motion.div
                    className="absolute top-0 right-0 pointer-events-none"
                    animate={{
                      rotate: 360,
                    }}
                    transition={{
                      duration: 20,
                      repeat: Infinity,
                      ease: "linear",
                    }}
                  >
                    <Sparkles className="h-32 w-32 text-luxury-gold/10" />
                  </motion.div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </AnimatePresence>
  );
}

