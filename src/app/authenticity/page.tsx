"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { motion, AnimatePresence } from "framer-motion";
import { QrCode, Search, ArrowRight, Sparkles } from "lucide-react";
import Navbar from "@/components/layout/Navbar";
import { Scanner } from "@/components/shared/Scanner";
import { VerificationResult } from "@/components/shared/VerificationResult";
import { MotionFadeIn } from "@/components/shared/MotionFadeIn";
import { useRouter } from "next/navigation";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

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

export default function AuthenticityPage() {
  const [showScanner, setShowScanner] = useState(false);
  const [showManualInput, setShowManualInput] = useState(false);
  const [serialNumber, setSerialNumber] = useState("");
  const [verificationData, setVerificationData] = useState<VerificationData | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const heroRef = useRef<HTMLDivElement | null>(null);
  const router = useRouter();

  useGSAP(
    () => {
      if (!heroRef.current) return;

      const ctx = gsap.context(() => {
        gsap.fromTo(
          heroRef.current?.querySelectorAll("[data-hero]") || [],
          { opacity: 0, y: 60 },
          {
            opacity: 1,
            y: 0,
            duration: 1.2,
            stagger: 0.15,
            ease: "power3.out",
          }
        );

        // Floating particles animation
        const particles = heroRef.current?.querySelectorAll("[data-particle]");
        if (particles) {
          particles.forEach((particle, index) => {
            gsap.to(particle, {
              y: -20,
              x: Math.sin(index) * 20,
              opacity: 0.6,
              duration: 3 + index * 0.5,
              repeat: -1,
              yoyo: true,
              ease: "sine.inOut",
            });
          });
        }
      }, heroRef);

      return () => ctx.revert();
    },
    { scope: heroRef }
  );

  const handleScanSuccess = async (decodedText: string) => {
    setShowScanner(false);
    await verifySerial(decodedText);
  };

  const handleManualVerify = async () => {
    if (!serialNumber.trim()) return;
    await verifySerial(serialNumber.trim());
  };

  const verifySerial = async (serial: string) => {
    setIsVerifying(true);
    setVerificationData(null);

    try {
      const response = await fetch(`/api/verify/${encodeURIComponent(serial)}`);
      const data = await response.json();

      if (response.ok && data.success) {
        setVerificationData({
          weight: `${data.product?.weight || "N/A"}gr`,
          purity: data.product?.purity || "99.99%",
          serialNumber: serial,
          productName: data.product?.name || "Unknown Product",
          firstScanned: data.firstScanned
            ? new Date(data.firstScanned).toLocaleDateString()
            : undefined,
          totalScans: data.scanCount || 0,
          locations: data.locations || [],
          isAuthentic: true,
        });
      } else {
        setVerificationData({
          weight: "N/A",
          purity: "N/A",
          serialNumber: serial,
          productName: "Unknown Product",
          totalScans: 0,
          isAuthentic: false,
        });
      }
    } catch (error) {
      setVerificationData({
        weight: "N/A",
        purity: "N/A",
        serialNumber: serial,
        productName: "Error",
        totalScans: 0,
        isAuthentic: false,
      });
    } finally {
      setIsVerifying(false);
    }
  };

  const pageRef = useRef<HTMLDivElement>(null);
  const noiseOverlay = useRef<HTMLDivElement>(null);
  const gradientOverlay = useRef<HTMLDivElement>(null);
  const sectionsRef = useRef<(HTMLDivElement | null)[]>([]);

  const premiumGradient = useMemo(
    () =>
      "linear-gradient(160deg, rgba(18,18,18,0.94) 0%, rgba(10,10,10,0.98) 55%, rgba(6,6,6,1) 100%)",
    []
  );

  useGSAP(
    () => {
      if (!pageRef.current) return;

      const ctx = gsap.context(() => {
        gsap.set("[data-reveal]", { autoAlpha: 0, y: 40 });

        sectionsRef.current.forEach((section) => {
          if (!section) return;
          const targets = section.querySelectorAll("[data-reveal]");

          ScrollTrigger.batch(targets, {
            start: "top 80%",
            onEnter: (batch) =>
              gsap.to(batch, {
                autoAlpha: 1,
                y: 0,
                duration: 0.6,
                stagger: 0.12,
                ease: "power3.out",
              }),
            once: true,
          });
        });
      }, pageRef);

      return () => ctx.revert();
    },
    { scope: pageRef }
  );

  useEffect(() => {
    if (!noiseOverlay.current) return;

    noiseOverlay.current.style.backgroundImage =
      'url(\'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" preserveAspectRatio="none"><filter id="n"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="3"/></filter><rect width="100%" height="100%" filter="url(%23n)" opacity="0.15"/></svg>\')';
  }, []);

  return (
    <div
      ref={pageRef}
      className="min-h-screen bg-luxury-black text-white selection:bg-luxury-gold/20 selection:text-white"
      style={{ backgroundImage: premiumGradient }}
    >
      <div
        ref={noiseOverlay}
        className="pointer-events-none fixed inset-0 z-0 opacity-60 mix-blend-soft-light"
      />
      <div
        ref={gradientOverlay}
        className="pointer-events-none fixed inset-0 z-0 opacity-90"
        style={{
          background:
            "linear-gradient(180deg, rgba(18,18,18,0.7) 0%, rgba(10,10,10,0.85) 45%, rgba(4,4,4,0.95) 100%)",
        }}
      />
      <Navbar />

      {/* Hero Section */}
      <section
        ref={(element) => {
          const divElement = element as HTMLDivElement | null;
          sectionsRef.current[0] = divElement;
          heroRef.current = divElement;
        }}
        className="relative min-h-screen flex items-center justify-center overflow-hidden pt-24 md:pt-32"
      >
        {/* Animated Background */}
        <div className="absolute inset-0 z-0">
          <div className="absolute inset-0 bg-gradient-to-b from-luxury-black/40 via-luxury-black/60 to-luxury-black" />
          <div className="absolute inset-0 bg-gradient-to-t from-luxury-black via-luxury-black/80 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-r from-luxury-black/50 via-transparent to-luxury-black/30" />
          <div className="absolute inset-x-0 bottom-0 h-64 bg-gradient-to-t from-luxury-black via-luxury-black/95 to-transparent" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,rgba(10,10,10,0.4)_100%)]" />
          
          {/* Floating Particles */}
          {Array.from({ length: 20 }).map((_, i) => (
            <motion.div
              key={i}
              data-particle
              className="absolute h-2 w-2 rounded-full bg-luxury-gold opacity-20"
              style={{
                left: `${(i * 5) % 100}%`,
                top: `${(i * 7) % 100}%`,
              }}
            />
          ))}
        </div>

        {/* Content */}
        <div className="relative z-10 mx-auto w-full max-w-4xl px-6 py-24 text-center">
          <MotionFadeIn direction="up">
            <motion.div data-hero className="mb-6">
              <motion.div
                animate={{ rotate: [0, 360] }}
                transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                className="mx-auto mb-8 flex h-24 w-24 items-center justify-center rounded-full border-2 border-luxury-gold/30 bg-gradient-to-br from-luxury-gold/10 to-transparent"
              >
                <QrCode className="h-12 w-12 text-luxury-gold" />
              </motion.div>
            </motion.div>
          </MotionFadeIn>

          <MotionFadeIn direction="up" delay={0.2}>
            <motion.h1
              data-hero
              className="mb-6 font-sans text-5xl font-bold leading-tight sm:text-6xl md:text-7xl"
            >
              <span className="bg-gradient-to-r from-luxury-gold via-luxury-lightGold to-luxury-gold bg-clip-text text-transparent">
                Authenticate
              </span>
              <br />
              <span className="text-white">Your Silver King Bar</span>
            </motion.h1>
          </MotionFadeIn>

          <MotionFadeIn direction="up" delay={0.4}>
            <motion.p
              data-hero
              className="mx-auto mb-12 max-w-2xl text-lg leading-relaxed text-white/80 sm:text-xl"
            >
              Scan the QR code or enter your serial number to verify authenticity and view
              complete provenance details.
            </motion.p>
          </MotionFadeIn>

          <MotionFadeIn direction="up" delay={0.6}>
            <motion.div data-hero className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setShowScanner(true)}
                className="group relative inline-flex items-center justify-center gap-3 overflow-hidden rounded-full bg-gradient-to-r from-luxury-gold to-luxury-lightGold px-9 py-4 text-base font-semibold text-black transition-all duration-300 hover:shadow-[0_35px_90px_-35px_rgba(212,175,55,0.8)]"
              >
                <QrCode className="h-5 w-5" />
                Scan QR Code
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setShowManualInput(true)}
                className="inline-flex items-center justify-center gap-3 rounded-full border border-white/20 bg-white/[0.04] px-8 py-4 text-base font-semibold text-white backdrop-blur-sm transition-all duration-300 hover:border-white/40 hover:bg-white/10"
              >
                <Search className="h-5 w-5" />
                Enter Serial
              </motion.button>
            </motion.div>
          </MotionFadeIn>
        </div>
      </section>

      {/* Scanner Modal */}
      <AnimatePresence>
        {showScanner && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm p-6"
            onClick={() => setShowScanner(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <Scanner
                onScanSuccess={handleScanSuccess}
                onClose={() => setShowScanner(false)}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Manual Input Section */}
      <AnimatePresence>
        {showManualInput && (
          <section
            ref={(element) => {
              sectionsRef.current[1] = element as HTMLDivElement | null;
            }}
            className="relative border-t border-white/10 bg-gradient-to-b from-[#171717] via-[#0f0f0f] to-[#060606] py-28 md:py-36 px-6"
          >
            <div className="mx-auto max-w-2xl">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="rounded-3xl border border-white/10 bg-gradient-to-br from-white/5 via-white/[0.03] to-transparent p-10 backdrop-blur-xl shadow-[0_20px_70px_-30px_rgba(0,0,0,0.7)]"
              >
                <h2 className="mb-4 font-sans text-2xl font-bold text-white">
                  Enter Serial Number
                </h2>
                <div className="mb-6 flex gap-4">
                  <input
                    type="text"
                    value={serialNumber}
                    onChange={(e) => setSerialNumber(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleManualVerify()}
                    placeholder="e.g., SKA000001"
                    className="flex-1 rounded-lg border border-white/20 bg-white/[0.04] px-4 py-3 font-mono text-white placeholder:text-white/40 focus:border-luxury-gold focus:outline-none focus:ring-2 focus:ring-luxury-gold/30"
                  />
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={handleManualVerify}
                    disabled={isVerifying || !serialNumber.trim()}
                    className="rounded-lg bg-gradient-to-r from-luxury-gold to-luxury-lightGold px-6 py-3 font-sans font-semibold text-black disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isVerifying ? "Verifying..." : "Verify Now"}
                  </motion.button>
                </div>
                <button
                  onClick={() => {
                    setShowManualInput(false);
                    setSerialNumber("");
                  }}
                  className="text-sm text-white/60 hover:text-white"
                >
                  Cancel
                </button>
              </motion.div>
            </div>
          </section>
        )}
      </AnimatePresence>

      {/* Verification Result */}
      <AnimatePresence>
        {verificationData && (
          <section
            ref={(element) => {
              sectionsRef.current[2] = element as HTMLDivElement | null;
            }}
            className="relative border-t border-white/10 bg-gradient-to-b from-[#171717] via-[#0f0f0f] to-[#060606] py-28 md:py-36 px-6"
          >
            <div className="mx-auto max-w-2xl">
              <VerificationResult data={verificationData} />
              
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="mt-8 text-center"
              >
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => {
                    setVerificationData(null);
                    setShowManualInput(false);
                    setSerialNumber("");
                  }}
                  className="group inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/5 px-6 py-3 font-sans font-semibold text-white backdrop-blur-sm transition-all hover:bg-white/10"
                >
                  Verify Another Bar
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </motion.button>
              </motion.div>
            </div>
          </section>
        )}
      </AnimatePresence>

      {/* Info Section */}
      {!verificationData && !showManualInput && (
        <section
          ref={(element) => {
            sectionsRef.current[3] = element as HTMLDivElement | null;
          }}
          className="relative overflow-hidden border-t border-white/10 bg-gradient-to-b from-[#171717] via-[#0f0f0f] to-[#060606] py-28 md:py-36 px-6"
        >
          <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-luxury-black via-transparent to-transparent" />
          <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-luxury-black via-transparent to-transparent" />

          <div className="relative z-10 mx-auto max-w-[1320px]">
            <motion.div className="mb-20 text-center" data-reveal>
              <h2 className="mb-5 text-4xl md:text-5xl lg:text-6xl font-light tracking-tight">
                <span className="text-white">Why</span>{" "}
                <span className="bg-gradient-to-r from-luxury-gold to-luxury-lightGold bg-clip-text text-transparent">
                  Verify?
                </span>
              </h2>
              <p className="mx-auto max-w-3xl text-lg md:text-xl text-luxury-silver/70">
                Every Silver King bar comes with complete traceability
              </p>
            </motion.div>

            <div className="grid grid-cols-1 gap-10 md:grid-cols-3 md:gap-12">
              <motion.div
                data-reveal
                className="group relative min-h-[280px] rounded-3xl border border-white/10 bg-gradient-to-br from-white/5 to-white/[0.02] p-10 backdrop-blur-xl transition-all duration-500 hover:border-luxury-gold/40 hover:shadow-[0px_30px_80px_-40px_rgba(212,175,55,0.6)]"
              >
                <div
                  className="absolute -inset-px rounded-3xl bg-gradient-to-br opacity-0 blur-2xl transition-opacity duration-500 group-hover:opacity-20"
                  style={{ background: `linear-gradient(to bottom right, var(--tw-gradient-stops))` }}
                />
                <div className="relative z-10">
                  <div className="mb-6 inline-flex rounded-2xl bg-gradient-to-br from-luxury-gold to-luxury-lightGold p-4 shadow-lg">
                    <Sparkles className="h-6 w-6 text-white" />
                  </div>
                  <h3 className="mb-3 text-2xl font-semibold text-white">Authenticity</h3>
                  <p className="text-luxury-silver/80 leading-relaxed">
                    Verify that your bar is genuine Silver King product
                  </p>
                </div>
              </motion.div>

              <motion.div
                data-reveal
                className="group relative min-h-[280px] rounded-3xl border border-white/10 bg-gradient-to-br from-white/5 to-white/[0.02] p-10 backdrop-blur-xl transition-all duration-500 hover:border-luxury-gold/40 hover:shadow-[0px_30px_80px_-40px_rgba(212,175,55,0.6)]"
              >
                <div
                  className="absolute -inset-px rounded-3xl bg-gradient-to-br opacity-0 blur-2xl transition-opacity duration-500 group-hover:opacity-20"
                  style={{ background: `linear-gradient(to bottom right, var(--tw-gradient-stops))` }}
                />
                <div className="relative z-10">
                  <div className="mb-6 inline-flex rounded-2xl bg-gradient-to-br from-luxury-silver to-white p-4 shadow-lg">
                    <QrCode className="h-6 w-6 text-white" />
                  </div>
                  <h3 className="mb-3 text-2xl font-semibold text-white">Traceability</h3>
                  <p className="text-luxury-silver/80 leading-relaxed">
                    View complete provenance and manufacturing details
                  </p>
                </div>
              </motion.div>

              <motion.div
                data-reveal
                className="group relative min-h-[280px] rounded-3xl border border-white/10 bg-gradient-to-br from-white/5 to-white/[0.02] p-10 backdrop-blur-xl transition-all duration-500 hover:border-luxury-gold/40 hover:shadow-[0px_30px_80px_-40px_rgba(212,175,55,0.6)]"
              >
                <div
                  className="absolute -inset-px rounded-3xl bg-gradient-to-br opacity-0 blur-2xl transition-opacity duration-500 group-hover:opacity-20"
                  style={{ background: `linear-gradient(to bottom right, var(--tw-gradient-stops))` }}
                />
                <div className="relative z-10">
                  <div className="mb-6 inline-flex rounded-2xl bg-gradient-to-br from-luxury-gold to-luxury-lightGold p-4 shadow-lg">
                    <Search className="h-6 w-6 text-white" />
                  </div>
                  <h3 className="mb-3 text-2xl font-semibold text-white">Security</h3>
                  <p className="text-luxury-silver/80 leading-relaxed">
                    Encrypted QR codes prevent counterfeiting
                  </p>
                </div>
              </motion.div>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}

