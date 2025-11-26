"use client";

import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import {
  QrCode,
  Search,
  ArrowDown,
  Sparkles,
  Camera,
  Shield,
  CheckCircle2,
  Github,
  Instagram,
  Twitter,
  Linkedin,
  Youtube,
  X,
} from "lucide-react";
import Link from "next/link";
import Navbar from "@/components/layout/Navbar";
import { Scanner } from "@/components/shared/Scanner";
import { APP_NAME } from "@/utils/constants";
import { getR2UrlClient } from "@/utils/r2-url";

// Register GSAP plugins safely
if (typeof window !== "undefined") {
  try {
    gsap.registerPlugin(ScrollTrigger);
  } catch (error) {
    console.warn("GSAP ScrollTrigger registration failed:", error);
  }
}

const workflowSteps = [
  {
    id: 1,
    title: "Locate QR Code",
    description: "Find the QR code on your Silver King bar packaging",
    icon: QrCode,
  },
  {
    id: 2,
    title: "Scan Code",
    description: "Use your phone camera or our scanner",
    icon: Camera,
  },
  {
    id: 3,
    title: "Verification",
    description: "System verifies encrypted serial number",
    icon: Shield,
  },
  {
    id: 4,
    title: "Confirmation",
    description: "Receive authenticity & provenance data",
    icon: CheckCircle2,
  },
];

// Detect if device is mobile
const useIsMobile = () => {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);

    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  return isMobile;
};

function CTASection() {
  const scrollToVerification = useCallback(() => {
    try {
      const verificationSection = document.querySelector("[data-verification-section]");
      if (verificationSection) {
        verificationSection.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    } catch (error) {
      console.error("Error scrolling to verification section:", error);
    }
  }, []);

  return (
    <section className="relative px-6 md:px-8 lg:px-12 py-12 md:py-16">
      <div className="relative z-10 mx-auto max-w-[1400px]">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="text-center"
        >
          <button
            onClick={scrollToVerification}
            className="group inline-flex flex-col items-center gap-2 text-white/60 hover:text-white transition-colors duration-300"
          >
            <span className="text-sm md:text-base font-light tracking-wide">
              Learn verification process
            </span>
            <ArrowDown className="h-4 w-4 md:h-5 md:w-5 transition-transform duration-300 group-hover:translate-y-1" />
          </button>
        </motion.div>
      </div>
    </section>
  );
}

// Optimized WorkflowTimeline with reduced animations for mobile
function WorkflowTimeline() {
  const timelineRef = useRef<HTMLDivElement>(null);
  const pathRef = useRef<SVGPathElement>(null);
  const stepRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [activeStep, setActiveStep] = useState<number | null>(null);
  const isMobile = useIsMobile();
  const prefersReducedMotion = useReducedMotion();

  useGSAP(
    () => {
      if (!timelineRef.current || prefersReducedMotion) return;

      const ctx = gsap.context(() => {
        // Only animate path on desktop
        if (!isMobile && pathRef.current) {
          const path = pathRef.current;
          const pathLength = path.getTotalLength();
          path.style.strokeDasharray = `${pathLength}`;
          path.style.strokeDashoffset = `${pathLength}`;

          gsap.to(path, {
            strokeDashoffset: 0,
            ease: "none",
            scrollTrigger: {
              trigger: timelineRef.current,
              start: "top 60%",
              end: "bottom 20%",
              scrub: 1,
            },
          });
        }

        // Simplified step animations for mobile
        stepRefs.current.forEach((stepRef, index) => {
          if (!stepRef) return;

          const stepCard = stepRef.querySelector("[data-step-card]");
          if (!stepCard) return;

          // Simple fade in only
          gsap.fromTo(
            stepCard,
            { opacity: 0, y: 20 },
            {
              opacity: 1,
              y: 0,
              duration: 0.6,
              ease: "power2.out",
              scrollTrigger: {
                trigger: stepRef,
                start: "top 80%",
                toggleActions: "play none none none",
                once: true,
              },
            }
          );
        });
      }, timelineRef);

      return () => ctx.revert();
    },
    { scope: timelineRef, dependencies: [isMobile, prefersReducedMotion] }
  );

  return (
    <div ref={timelineRef} className="relative">
      {/* SVG Path - Simplified for mobile */}
      {!isMobile && (
        <div className="absolute left-1/2 top-0 hidden h-full w-0.5 md:block">
          <svg className="h-full w-full" viewBox="0 0 2 1000" preserveAspectRatio="none">
            <defs>
              <linearGradient id="workflow-gradient" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#D4AF37" stopOpacity="0.2" />
                <stop offset="50%" stopColor="#D4AF37" stopOpacity="0.6" />
                <stop offset="100%" stopColor="#D4AF37" stopOpacity="0.2" />
              </linearGradient>
            </defs>
            <path
              ref={pathRef}
              d="M 1 0 L 1 1000"
              stroke="url(#workflow-gradient)"
              strokeWidth="2"
              fill="none"
            />
          </svg>
        </div>
      )}

      {/* Mobile simple line */}
      {isMobile && (
        <div className="absolute left-8 top-0 h-full w-0.5 bg-gradient-to-b from-luxury-gold/20 via-luxury-gold/40 to-luxury-gold/20" />
      )}

      {/* Steps */}
      <div className="relative space-y-12 md:space-y-20">
        {workflowSteps.map((step, index) => {
          const Icon = step.icon;
          const isEven = index % 2 === 0;

          return (
            <div
              key={step.id}
              ref={(el) => {
                stepRefs.current[index] = el;
              }}
              className={`relative flex items-center gap-8 ${
                isEven ? "md:flex-row" : "md:flex-row-reverse"
              }`}
            >
              {/* Step Content */}
              <div
                data-step-card
                className={`flex-1 pl-20 md:pl-0 ${isEven ? "md:pr-16 md:text-right" : "md:pl-16"}`}
              >
                <div className="group relative rounded-2xl border border-white/10 bg-gradient-to-br from-white/5 to-transparent p-6 backdrop-blur-sm transition-all duration-300 hover:border-luxury-gold/40">
                  <h3 className="mb-2 text-xl font-semibold text-white">{step.title}</h3>
                  <p className="text-sm text-luxury-silver/70 leading-relaxed">
                    {step.description}
                  </p>
                </div>
              </div>

              {/* Step Icon */}
              <div className="absolute left-0 md:left-1/2 md:-translate-x-1/2">
                <div className="relative">
                  <div className="relative flex h-16 w-16 items-center justify-center rounded-full border-2 border-luxury-gold/50 bg-gradient-to-br from-luxury-gold/20 to-luxury-black backdrop-blur-sm">
                    <Icon className="h-8 w-8 text-luxury-gold" />
                  </div>
                  <div className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br from-luxury-gold to-luxury-lightGold text-xs font-bold text-black">
                    {step.id}
                  </div>
                </div>
              </div>

              <div className="hidden flex-1 md:block" />
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function AuthenticityPage() {
  const [showScanner, setShowScanner] = useState(false);
  const [showManualInput, setShowManualInput] = useState(false);
  const [serialNumber, setSerialNumber] = useState("");
  const [isVideoLoaded, setIsVideoLoaded] = useState(false);
  const heroRef = useRef<HTMLDivElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const isMobile = useIsMobile();
  const prefersReducedMotion = useReducedMotion();

  // Simplified hero animations
  useGSAP(
    () => {
      if (!heroRef.current || prefersReducedMotion) return;

      try {
        const ctx = gsap.context(() => {
          const targets = heroRef.current?.querySelectorAll("[data-hero]");
          if (!targets) return;

          gsap.fromTo(
            targets,
            { opacity: 0, y: 20 },
            {
              opacity: 1,
              y: 0,
              duration: 0.8,
              stagger: 0.1,
              ease: "power2.out",
            }
          );
        }, heroRef);

        return () => ctx.revert();
      } catch (error) {
        console.error("GSAP animation error:", error);
      }
    },
    { scope: heroRef, dependencies: [prefersReducedMotion] }
  );

  // Optimized video handling for mobile
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    // On mobile, don't autoplay video to save bandwidth and performance
    if (isMobile) {
      video.pause();
      return;
    }

    const forcePlay = async () => {
      try {
        if (video.paused && !video.ended) {
          await video.play();
        }
      } catch (error) {
        console.warn("[AuthenticityPage] Video autoplay prevented:", error);
      }
    };

    const handlePause = () => {
      if (!video.ended && !isMobile) {
        forcePlay();
      }
    };

    const handleEnded = () => {
      video.currentTime = 0;
      if (!isMobile) {
        forcePlay();
      }
    };

    forcePlay();

    video.addEventListener("pause", handlePause);
    video.addEventListener("ended", handleEnded);

    return () => {
      video.removeEventListener("pause", handlePause);
      video.removeEventListener("ended", handleEnded);
    };
  }, [isMobile]);

  const handleScanSuccess = useCallback(async (decodedText: string) => {
    try {
      console.log("[Authenticity] QR code scanned:", decodedText);

      if (!decodedText || !decodedText.trim()) {
        console.error("[Authenticity] Empty QR code scanned");
        return;
      }

      setShowScanner(false);

      let serialCode = decodedText.trim();

      if (serialCode.includes("/verify/")) {
        const urlMatch = serialCode.match(/\/verify\/([A-Z0-9]+)/i);
        if (urlMatch && urlMatch[1]) {
          serialCode = urlMatch[1];
        }
      } else if (serialCode.includes("http")) {
        const urlParts = serialCode.split("/");
        serialCode = urlParts[urlParts.length - 1] || serialCode;
      }

      const normalizedSerial = serialCode.toUpperCase().replace(/[^A-Z0-9]/g, "");

      if (!normalizedSerial || normalizedSerial.length < 3) {
        alert("Invalid QR code format. Please scan a valid Silver King QR code.");
        return;
      }

      window.location.href = `/verify/${normalizedSerial}`;
    } catch (error) {
      console.error("[Authenticity] Error handling scan success:", error);
      setShowScanner(false);
      alert("Failed to process QR code. Please try again.");
    }
  }, []);

  const handleManualVerify = useCallback(async () => {
    try {
      if (!serialNumber.trim()) {
        alert("Please enter a serial number");
        return;
      }

      const serialCode = serialNumber
        .trim()
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, "");

      if (!serialCode || serialCode.length < 3) {
        alert("Invalid serial number format. Please enter a valid serial code (e.g., SKA000001)");
        return;
      }

      setShowManualInput(false);
      setSerialNumber("");

      window.location.href = `/verify/${serialCode}`;
    } catch (error) {
      console.error("[Authenticity] Error in handleManualVerify:", error);
      alert("Failed to verify. Please try again.");
    }
  }, [serialNumber]);

  // Memoized animation variants
  const fadeInVariant = useMemo(
    () => ({
      initial: { opacity: 0, y: 20 },
      animate: { opacity: 1, y: 0 },
      transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] as const },
    }),
    []
  );

  return (
    <div className="min-h-screen bg-luxury-black text-white">
      <div className="pointer-events-none fixed inset-0 bg-gradient-to-b from-luxury-black via-[#0a0a0a] to-luxury-black" />

      <Navbar />

      {/* Hero Section - Optimized */}
      <section
        ref={heroRef}
        className="relative flex min-h-[75vh] md:min-h-[85vh] items-center justify-center overflow-hidden px-6 pt-24 pb-12"
      >
        {/* Background - Conditional rendering for mobile */}
        <div className="absolute inset-0 z-0 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-luxury-black via-luxury-black/95 to-luxury-black z-0" />

          {/* Video only on desktop or when explicitly loaded */}
          {!isMobile && (
            <video
              ref={videoRef}
              autoPlay
              loop
              muted
              playsInline
              preload="metadata"
              className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-1000 z-10 ${
                isVideoLoaded ? "opacity-100" : "opacity-0"
              }`}
              onCanPlay={() => setIsVideoLoaded(true)}
              onLoadedData={() => setIsVideoLoaded(true)}
            >
              <source
                src={getR2UrlClient("/videos/hero/mobile scanning qr.mp4")}
                type="video/mp4"
              />
            </video>
          )}

          {/* Overlays */}
          <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/50 to-black/70 z-20" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_30%,rgba(0,0,0,0.8)_100%)] z-20" />
          <div className="absolute inset-x-0 bottom-0 h-40 md:h-52 bg-gradient-to-t from-luxury-black via-luxury-black/60 to-transparent z-20" />
        </div>

        {/* Content */}
        <div className="relative z-20 mx-auto w-full max-w-3xl text-center">
          <motion.div {...fadeInVariant} data-hero className="mb-4">
            <div className="mx-auto mb-4 flex h-16 w-16 md:h-20 md:w-20 items-center justify-center rounded-full border border-luxury-gold/30 bg-luxury-gold/5">
              <QrCode className="h-8 w-8 md:h-10 md:w-10 text-luxury-gold" />
            </div>
          </motion.div>

          <motion.h1
            {...fadeInVariant}
            data-hero
            className="mb-4 text-3xl sm:text-4xl md:text-5xl font-light leading-tight text-white"
          >
            Authenticate Your
            <span className="block bg-gradient-to-r from-luxury-gold to-luxury-lightGold bg-clip-text font-semibold text-transparent">
              Silver King Bar
            </span>
          </motion.h1>

          <motion.p
            {...fadeInVariant}
            data-hero
            className="mx-auto mb-8 max-w-xl text-sm sm:text-base leading-relaxed text-luxury-silver/70"
          >
            Scan the QR code or enter serial number to verify authenticity and view provenance
            details
          </motion.p>

          <motion.div
            {...fadeInVariant}
            data-hero
            className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center"
          >
            <button
              type="button"
              onClick={() => setShowScanner(true)}
              className="inline-flex w-full sm:w-auto items-center justify-center gap-2 rounded-full bg-luxury-gold px-6 py-3 text-sm font-semibold text-black transition-all hover:bg-luxury-lightGold active:scale-95"
            >
              <QrCode className="h-4 w-4" />
              Scan QR Code
            </button>

            <span className="text-sm text-white/40 font-light">or</span>

            <button
              type="button"
              onClick={() => setShowManualInput(true)}
              className="inline-flex w-full sm:w-auto items-center justify-center gap-2 rounded-full border border-white/20 bg-white/5 px-6 py-3 text-sm font-semibold text-white transition-all hover:border-white/30 hover:bg-white/10 active:scale-95"
            >
              <Search className="h-4 w-4" />
              Enter Serial
            </button>
          </motion.div>
        </div>
      </section>

      <CTASection />

      {/* Verification Workflow Section */}
      <section
        data-verification-section
        className="relative overflow-hidden border-t border-white/10 bg-gradient-to-b from-luxury-black/50 to-luxury-black py-16 md:py-24 px-6"
      >
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(212,175,55,0.03)_0%,transparent_70%)]" />

        <div className="relative z-10 mx-auto max-w-6xl">
          <motion.div
            className="mb-16 text-center"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="mb-3 text-3xl md:text-4xl font-light text-white">
              Verification{" "}
              <span className="bg-gradient-to-r from-luxury-gold to-luxury-lightGold bg-clip-text font-semibold text-transparent">
                Process
              </span>
            </h2>
            <p className="text-sm md:text-base text-luxury-silver/70">
              Simple four-step verification for your Silver King bar
            </p>
          </motion.div>

          <WorkflowTimeline />
        </div>
      </section>

      {/* Scanner Modal */}
      <AnimatePresence mode="wait">
        {showScanner && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4"
            onClick={() => setShowScanner(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md"
            >
              <Scanner onScanSuccess={handleScanSuccess} onClose={() => setShowScanner(false)} />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Manual Input Modal */}
      <AnimatePresence mode="wait">
        {showManualInput && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-md p-4"
            onClick={() => {
              setShowManualInput(false);
              setSerialNumber("");
            }}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md"
            >
              <div className="relative rounded-2xl border border-white/10 bg-gradient-to-br from-white/5 to-transparent p-6 backdrop-blur-xl">
                <button
                  onClick={() => {
                    setShowManualInput(false);
                    setSerialNumber("");
                  }}
                  className="absolute top-4 right-4 rounded-full bg-black/50 p-2 text-white/80 hover:text-white transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>

                <h2 className="mb-4 text-xl font-semibold text-white">Enter Serial Number</h2>
                <div className="mb-4 flex gap-2">
                  <input
                    type="text"
                    value={serialNumber}
                    onChange={(e) => setSerialNumber(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleManualVerify()}
                    placeholder="e.g., SKA000001"
                    className="flex-1 rounded-lg border border-white/20 bg-white/5 px-4 py-2.5 text-sm text-white placeholder:text-white/40 focus:border-luxury-gold focus:outline-none focus:ring-2 focus:ring-luxury-gold/30"
                    autoFocus
                  />
                  <button
                    onClick={handleManualVerify}
                    disabled={!serialNumber.trim()}
                    className="rounded-lg bg-gradient-to-r from-luxury-gold to-luxury-lightGold px-5 py-2.5 text-sm font-semibold text-black transition-opacity disabled:opacity-50"
                  >
                    Verify
                  </button>
                </div>
                <p className="text-xs text-white/50 text-center">
                  Enter the serial number found on your Silver King bar
                </p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Benefits Section */}
      <section className="relative overflow-hidden border-t border-white/5 py-16 px-6">
        <div className="relative z-10 mx-auto max-w-5xl">
          <div className="mb-12 text-center">
            <h2 className="mb-3 text-2xl md:text-3xl font-light text-white">
              Why{" "}
              <span className="bg-gradient-to-r from-luxury-gold to-luxury-lightGold bg-clip-text font-semibold text-transparent">
                Verify?
              </span>
            </h2>
            <p className="text-sm text-luxury-silver/60">
              Complete traceability for every Silver King bar
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3 md:gap-6">
            {[
              {
                icon: Sparkles,
                title: "Authenticity",
                desc: "Verify genuine Silver King products instantly",
              },
              {
                icon: QrCode,
                title: "Traceability",
                desc: "Complete provenance and manufacturing details",
              },
              {
                icon: Shield,
                title: "Security",
                desc: "Encrypted QR codes prevent counterfeiting",
              },
            ].map((item, i) => (
              <motion.div
                key={item.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ delay: i * 0.1, duration: 0.5 }}
                className="rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-sm"
              >
                <div className="mb-3 inline-flex rounded-xl bg-luxury-gold/10 p-2.5">
                  <item.icon className="h-5 w-5 text-luxury-gold" />
                </div>
                <h3 className="mb-2 text-base font-semibold text-white">{item.title}</h3>
                <p className="text-sm text-luxury-silver/70 leading-relaxed">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <section className="relative border-t border-white/10 px-6 py-12 md:py-16">
        <div className="relative z-10 mx-auto max-w-[1320px] flex flex-col md:flex-row items-start md:items-end justify-between gap-6">
          <div className="flex flex-wrap items-center gap-4 md:gap-6">
            <span className="text-white/40 text-sm">×</span>
            <Link
              href="/what-we-do"
              className="text-sm font-medium text-white/80 hover:text-white transition-colors"
            >
              What we do
            </Link>
            <Link
              href="/authenticity"
              className="text-sm font-medium text-white/80 hover:text-white transition-colors"
            >
              Authenticity
            </Link>
            <Link
              href="/products"
              className="text-sm font-medium text-white/80 hover:text-white transition-colors"
            >
              Products
            </Link>
            <Link
              href="/about"
              className="text-sm font-medium text-white/80 hover:text-white transition-colors"
            >
              About us
            </Link>
          </div>

          <div className="flex items-center gap-4">
            {[
              { icon: Github, href: "https://github.com" },
              { icon: Instagram, href: "https://instagram.com" },
              { icon: Twitter, href: "https://twitter.com" },
              { icon: Linkedin, href: "https://linkedin.com" },
              { icon: Youtube, href: "https://youtube.com" },
            ].map((social) => (
              <a
                key={social.href}
                href={social.href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-white/80 hover:text-white transition-colors"
              >
                <social.icon className="h-5 w-5" />
              </a>
            ))}
          </div>
        </div>

        <div className="mt-8 text-center">
          <p className="text-xs font-extralight text-white/25 tracking-wider uppercase">
            © {new Date().getFullYear()} {APP_NAME}. All rights reserved.
          </p>
        </div>
      </section>
    </div>
  );
}
