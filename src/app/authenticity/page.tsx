"use client";

import { useState, useRef, useEffect } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { motion, AnimatePresence } from "framer-motion";
import {
  QrCode,
  Search,
  ArrowRight,
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
import { VerificationModal } from "@/components/shared/VerificationModal";
import { useRouter } from "next/navigation";
import { APP_NAME } from "@/utils/constants";
import { getR2UrlClient } from "@/utils/r2-url";

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

function CTASection() {
  const scrollToVerification = () => {
    const verificationSection = document.querySelector("[data-verification-section]");
    if (verificationSection) {
      verificationSection.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  return (
    <section className="relative px-6 md:px-8 lg:px-12 py-16 md:py-20">
      <div className="relative z-10 mx-auto max-w-[1400px]">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="text-center"
        >
          <motion.button
            onClick={scrollToVerification}
            className="group inline-flex flex-col items-center gap-2 text-white/60 hover:text-white transition-all duration-300"
            animate={{
              y: [0, -8, 0],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          >
            <span className="text-sm md:text-base font-light tracking-wide">
              Learn verification process
            </span>
            <ArrowDown className="h-4 w-4 md:h-5 md:w-5 transition-transform duration-300 group-hover:translate-y-1" />
          </motion.button>
        </motion.div>
      </div>
    </section>
  );
}

function WorkflowTimeline() {
  const timelineRef = useRef<HTMLDivElement>(null);
  const pathRef = useRef<SVGPathElement>(null);
  const pathMobileRef = useRef<SVGPathElement>(null);
  const stepRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [activeStep, setActiveStep] = useState<number | null>(null);

  useGSAP(
    () => {
      if (!timelineRef.current) return;

      const ctx = gsap.context(() => {
        // Animate desktop path drawing
        if (pathRef.current) {
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

        // Animate mobile path drawing
        if (pathMobileRef.current) {
          const pathMobile = pathMobileRef.current;
          const pathMobileLength = pathMobile.getTotalLength();
          pathMobile.style.strokeDasharray = `${pathMobileLength}`;
          pathMobile.style.strokeDashoffset = `${pathMobileLength}`;

          gsap.to(pathMobile, {
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

        // Animate step cards with enhanced interactions
        stepRefs.current.forEach((stepRef, index) => {
          if (!stepRef) return;

          const stepCard = stepRef.querySelector("[data-step-card]");
          const stepIcon = stepRef.querySelector("[data-step-icon]");
          const stepGlow = stepRef.querySelector("[data-step-glow]");

          if (!stepCard || !stepIcon) return;

          // Fade in card with scale
          gsap.fromTo(
            stepCard,
            { opacity: 0, y: 40, scale: 0.95 },
            {
              opacity: 1,
              y: 0,
              scale: 1,
              duration: 0.8,
              ease: "power3.out",
              scrollTrigger: {
                trigger: stepRef,
                start: "top 75%",
                toggleActions: "play none none reverse",
              },
            }
          );

          // Animate icon with bounce
          gsap.fromTo(
            stepIcon,
            { scale: 0, opacity: 0, rotation: -180 },
            {
              scale: 1,
              opacity: 1,
              rotation: 0,
              duration: 0.8,
              ease: "back.out(1.7)",
              delay: 0.2,
              scrollTrigger: {
                trigger: stepRef,
                start: "top 75%",
                toggleActions: "play none none reverse",
              },
            }
          );

          // Pulsing glow effect
          if (stepGlow) {
            gsap.to(stepGlow, {
              scale: 1.4,
              opacity: 0.8,
              duration: 2,
              repeat: -1,
              yoyo: true,
              ease: "sine.inOut",
              scrollTrigger: {
                trigger: stepRef,
                start: "top 75%",
                toggleActions: "play none none reverse",
              },
            });
          }
        });
      }, timelineRef);

      return () => ctx.revert();
    },
    { scope: timelineRef }
  );

  return (
    <div ref={timelineRef} className="relative">
      {/* SVG Path - Desktop with animated drawing */}
      <div className="absolute left-8 top-0 hidden h-full w-0.5 md:left-1/2 md:block">
        <svg className="h-full w-full" viewBox="0 0 2 1000" preserveAspectRatio="none">
          <defs>
            <linearGradient id="workflow-gradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#D4AF37" stopOpacity="0.2" />
              <stop offset="50%" stopColor="#D4AF37" stopOpacity="0.6" />
              <stop offset="100%" stopColor="#D4AF37" stopOpacity="0.2" />
            </linearGradient>
            <filter id="glow">
              <feGaussianBlur stdDeviation="4" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          <path
            ref={pathRef}
            d="M 1 0 L 1 1000"
            stroke="url(#workflow-gradient)"
            strokeWidth="2"
            fill="none"
            filter="url(#glow)"
          />
        </svg>
      </div>

      {/* SVG Path - Mobile with animated drawing */}
      <div className="absolute left-8 top-0 block h-full w-0.5 md:hidden">
        <svg className="h-full w-full" viewBox="0 0 2 1000" preserveAspectRatio="none">
          <defs>
            <linearGradient id="workflow-gradient-mobile" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#D4AF37" stopOpacity="0.2" />
              <stop offset="50%" stopColor="#D4AF37" stopOpacity="0.6" />
              <stop offset="100%" stopColor="#D4AF37" stopOpacity="0.2" />
            </linearGradient>
            <filter id="glow-mobile">
              <feGaussianBlur stdDeviation="4" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          <path
            ref={pathMobileRef}
            d="M 1 0 L 1 1000"
            stroke="url(#workflow-gradient-mobile)"
            strokeWidth="2"
            fill="none"
            filter="url(#glow-mobile)"
          />
        </svg>
      </div>

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
              {/* Step Content with Enhanced Card */}
              <motion.div
                data-step-card
                className={`flex-1 pl-20 md:pl-0 ${isEven ? "md:pr-16 md:text-right" : "md:pl-16"}`}
                onHoverStart={() => setActiveStep(index)}
                onHoverEnd={() => setActiveStep(null)}
                whileHover={{ scale: 1.03, x: isEven ? -10 : 10 }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
              >
                <div
                  className={`group relative cursor-pointer rounded-3xl border transition-all duration-500 p-8 backdrop-blur-xl ${
                    activeStep === index
                      ? "border-luxury-gold/60 bg-gradient-to-br from-luxury-gold/10 via-white/5 to-transparent shadow-[0px_25px_70px_-30px_rgba(212,175,55,0.6)]"
                      : "border-white/10 bg-gradient-to-br from-white/5 via-white/[0.03] to-transparent hover:border-luxury-gold/40 hover:shadow-[0px_20px_60px_-30px_rgba(212,175,55,0.4)]"
                  }`}
                >
                  <div
                    className={`absolute -inset-px rounded-3xl bg-gradient-to-br from-luxury-gold/20 via-luxury-lightGold/20 to-luxury-gold/20 blur-xl transition-opacity duration-500 ${
                      activeStep === index ? "opacity-50" : "opacity-0 group-hover:opacity-30"
                    }`}
                  />
                  <div className="relative z-10">
                    <motion.h3
                      className="mb-3 text-2xl font-semibold text-white transition-colors group-hover:text-luxury-gold"
                      animate={{ color: activeStep === index ? "#D4AF37" : "#FFFFFF" }}
                    >
                      {step.title}
                    </motion.h3>
                    <p className="text-sm text-luxury-silver/70 leading-relaxed transition-colors group-hover:text-luxury-silver/90">
                      {step.description}
                    </p>
                  </div>
                </div>
              </motion.div>

              {/* Step Icon with Enhanced Interactions */}
              <div className="absolute left-0 md:left-1/2 md:-translate-x-1/2">
                <motion.div
                  className="relative"
                  animate={{
                    scale: activeStep === index ? 1.15 : 1,
                  }}
                  transition={{ type: "spring", stiffness: 400, damping: 17 }}
                >
                  {/* Glowing Pulse Circle */}
                  <motion.div
                    data-step-glow
                    className="absolute inset-0 -z-10 rounded-full bg-luxury-gold/30 blur-2xl"
                    animate={{
                      scale: activeStep === index ? 1.5 : 1.2,
                      opacity: activeStep === index ? 0.6 : 0.3,
                    }}
                    transition={{ duration: 0.3 }}
                  />

                  {/* Icon Circle with Gradient */}
                  <motion.div
                    data-step-icon
                    className="relative flex h-24 w-24 items-center justify-center rounded-full border-2 bg-gradient-to-br from-luxury-gold/20 via-luxury-gold/10 to-luxury-black shadow-[0_10px_30px_-10px_rgba(212,175,55,0.5)] backdrop-blur-sm"
                    animate={{
                      borderColor:
                        activeStep === index ? "rgba(212,175,55,0.8)" : "rgba(212,175,55,0.5)",
                      boxShadow:
                        activeStep === index
                          ? "0 0 40px rgba(212,175,55,0.7)"
                          : "0 10px 30px -10px rgba(212,175,55,0.5)",
                    }}
                    transition={{ duration: 0.3 }}
                  >
                    <motion.div
                      animate={{ rotate: activeStep === index ? [0, 5, -5, 0] : 0 }}
                      transition={{ duration: 0.5 }}
                    >
                      <Icon className="h-10 w-10 text-luxury-gold" />
                    </motion.div>
                  </motion.div>

                  {/* Step Number Badge */}
                  <motion.div
                    className="absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-luxury-gold to-luxury-lightGold text-xs font-bold text-black shadow-lg"
                    animate={{
                      scale: activeStep === index ? 1.2 : 1,
                      rotate: activeStep === index ? 360 : 0,
                    }}
                    transition={{ duration: 0.5 }}
                  >
                    {step.id}
                  </motion.div>
                </motion.div>
              </div>

              {/* Spacer */}
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
  const [verificationData, setVerificationData] = useState<VerificationData | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isVideoLoaded, setIsVideoLoaded] = useState(false);
  const heroRef = useRef<HTMLDivElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const router = useRouter();

  useGSAP(
    () => {
      if (!heroRef.current) return;

      const ctx = gsap.context(() => {
        gsap.fromTo(
          heroRef.current?.querySelectorAll("[data-hero]") || [],
          { opacity: 0, y: 40 },
          {
            opacity: 1,
            y: 0,
            duration: 1,
            stagger: 0.1,
            ease: "power2.out",
          }
        );

        // Minimal floating particles animation
        const particles = heroRef.current?.querySelectorAll("[data-particle]");
        if (particles) {
          particles.forEach((particle, index) => {
            gsap.to(particle, {
              y: -15,
              x: Math.sin(index) * 10,
              opacity: 0.4,
              duration: 4 + index * 0.5,
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
    try {
      if (!decodedText || !decodedText.trim()) {
        console.error("Empty QR code scanned");
        return;
      }
      setShowScanner(false);
      await verifySerial(decodedText);
    } catch (error) {
      console.error("Error handling scan success:", error);
      setShowScanner(false);
      // Still try to verify even if there's an error
      await verifySerial(decodedText || "");
    }
  };

  const handleOpenScanner = () => {
    console.log("Opening scanner...", showScanner);
    setShowScanner(true);
    console.log("Scanner state set to:", true);
  };

  const handleOpenManualInput = () => {
    console.log("Opening manual input...");
    setShowManualInput(true);
  };

  const handleManualVerify = async () => {
    if (!serialNumber.trim()) return;
    await verifySerial(serialNumber.trim());
  };

  const verifySerial = async (serial: string) => {
    // Close manual input modal when verification starts
    setShowManualInput(false);
    setIsVerifying(true);
    setVerificationData(null);

    try {
      // Extract serial code from URL if QR code contains full URL
      // QR codes contain URLs like: https://cahayasilverking.id/verify/SKA00001
      // or just the serial code: SKA00001
      let serialCode = serial.trim();
      
      if (!serialCode) {
        throw new Error("Serial code is empty");
      }
      
      // Check if it's a URL and extract serial code
      if (serialCode.includes("/verify/")) {
        // Extract serial code from URL
        const urlMatch = serialCode.match(/\/verify\/([A-Z0-9]+)/i);
        if (urlMatch && urlMatch[1]) {
          serialCode = urlMatch[1];
        }
      } else if (serialCode.includes("http")) {
        // Try to extract from any URL format
        const urlParts = serialCode.split("/");
        serialCode = urlParts[urlParts.length - 1] || serialCode;
      }
      
      // Normalize serial to uppercase (same as API does)
      const normalizedSerial = serialCode.toUpperCase().replace(/[^A-Z0-9]/g, "");
      
      if (!normalizedSerial || normalizedSerial.length < 3) {
        throw new Error("Invalid serial code format");
      }
      
      // Use the same endpoint for both scan and manual input
      const response = await fetch(`/api/verify/${encodeURIComponent(normalizedSerial)}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      // Check if response is ok
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Unknown error" }));
        throw new Error(errorData.error || `Verification failed: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();

      // Validate response data
      if (!data || typeof data !== "object") {
        throw new Error("Invalid response from server");
      }

      // API returns 'verified' or 'success'
      if (data.verified || data.success) {
        setVerificationData({
          weight: `${data.product?.weight || "N/A"}gr`,
          purity: data.product?.purity || "99.99%",
          serialNumber: normalizedSerial,
          productName: data.product?.name || "Unknown Product",
          firstScanned: data.firstScanned
            ? new Date(data.firstScanned).toLocaleDateString()
            : undefined,
          totalScans: data.scanCount || 0,
          locations: data.locations || [],
          isAuthentic: true,
        });
      } else {
        // Product not found or not verified
        setVerificationData({
          weight: "N/A",
          purity: "N/A",
          serialNumber: normalizedSerial,
          productName: data.error || "Product Not Found",
          totalScans: 0,
          isAuthentic: false,
        });
      }
    } catch (error: any) {
      console.error("Verification error:", error);
      
      // Extract serial code for display even on error
      let displaySerial = serial.trim();
      if (displaySerial.includes("/verify/")) {
        const match = displaySerial.match(/\/verify\/([A-Z0-9]+)/i);
        if (match && match[1]) {
          displaySerial = match[1].toUpperCase();
        }
      } else if (displaySerial.includes("http")) {
        const parts = displaySerial.split("/");
        displaySerial = parts[parts.length - 1] || displaySerial;
      }
      displaySerial = displaySerial.toUpperCase().replace(/[^A-Z0-9]/g, "");

      setVerificationData({
        weight: "N/A",
        purity: "N/A",
        serialNumber: displaySerial || "Unknown",
        productName: error?.message || "Verification Error",
        totalScans: 0,
        isAuthentic: false,
      });
    } finally {
      setIsVerifying(false);
    }
  };

  const pageRef = useRef<HTMLDivElement>(null);
  const sectionsRef = useRef<(HTMLDivElement | null)[]>([]);

  useGSAP(
    () => {
      if (!pageRef.current) return;

      const ctx = gsap.context(() => {
        sectionsRef.current.forEach((section) => {
          if (!section) return;
          const targets = section.querySelectorAll("[data-reveal]");

          ScrollTrigger.batch(targets, {
            start: "top 85%",
            onEnter: (batch) =>
              gsap.to(batch, {
                opacity: 1,
                y: 0,
                duration: 0.5,
                stagger: 0.1,
                ease: "power2.out",
              }),
            once: true,
          });
        });
      }, pageRef);

      return () => ctx.revert();
    },
    { scope: pageRef }
  );

  return (
    <div ref={pageRef} className="min-h-screen bg-luxury-black text-white">
      {/* Simplified Background */}
      <div className="pointer-events-none fixed inset-0 bg-gradient-to-b from-luxury-black via-[#0a0a0a] to-luxury-black" />

      <Navbar />

      {/* Hero Section with Video Background */}
      <section
        ref={(element) => {
          const divElement = element as HTMLDivElement | null;
          sectionsRef.current[0] = divElement;
          heroRef.current = divElement;
        }}
        className="relative flex min-h-[80vh] md:min-h-[85vh] lg:min-h-[90vh] items-center justify-center overflow-hidden px-6 pt-24 pb-12"
      >
        {/* Video Background */}
        <div className="absolute inset-0 z-0 overflow-hidden">
          {/* Fallback gradient background */}
          <div className="absolute inset-0 bg-gradient-to-br from-luxury-black via-luxury-black/95 to-luxury-black z-0" />
          
          {/* Video */}
          <video
            ref={videoRef}
            autoPlay
            loop
            muted
            playsInline
            preload="auto"
            className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-1000 will-change-transform z-10 ${
              isVideoLoaded ? "opacity-100" : "opacity-0"
            }`}
            style={{
              transform: "scale(1.05)",
              transformOrigin: "center center",
            }}
            onError={() => {
              setIsVideoLoaded(false);
            }}
            onCanPlay={() => {
              setIsVideoLoaded(true);
            }}
            onLoadedData={() => {
              setIsVideoLoaded(true);
            }}
          >
            <source src={getR2UrlClient("/videos/hero/mobile scanning qr.mp4")} type="video/mp4" />
          </video>

          {/* Dark overlays for better text readability */}
          <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/50 to-black/70 z-20" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,rgba(10,10,10,0.6)_100%)] z-20" />
          
          {/* Vignette effect */}
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_30%,rgba(0,0,0,0.8)_100%)] z-20" />
          
          {/* Soft fading at bottom for smooth transition */}
          <div className="absolute inset-x-0 bottom-0 h-40 md:h-52 lg:h-64 bg-gradient-to-t from-luxury-black via-luxury-black/60 to-transparent pointer-events-none z-20" />
        </div>

        {/* Minimal Particles - Reduced from 20 to 6 */}
        <div className="absolute inset-0 pointer-events-none z-[15]">
          {Array.from({ length: 6 }).map((_, i) => (
            <motion.div
              key={i}
              data-particle
              className="absolute h-1.5 w-1.5 rounded-full bg-luxury-gold/30 pointer-events-none"
              style={{
                left: `${((i * 17) % 90) + 5}%`,
                top: `${((i * 23) % 80) + 10}%`,
              }}
            />
          ))}
        </div>

        {/* Content */}
        <div className="relative z-20 mx-auto w-full max-w-3xl text-center">
          <motion.div data-hero className="mb-4">
            <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full border border-luxury-gold/30 bg-luxury-gold/5">
              <QrCode className="h-10 w-10 text-luxury-gold" />
            </div>
          </motion.div>

          <motion.h1
            data-hero
            className="mb-4 text-4xl font-light leading-tight text-white sm:text-5xl md:text-6xl"
          >
            Authenticate Your
            <span className="block bg-gradient-to-r from-luxury-gold to-luxury-lightGold bg-clip-text font-semibold text-transparent">
              Silver King Bar
            </span>
          </motion.h1>

          <motion.p
            data-hero
            className="mx-auto mb-8 max-w-xl text-base leading-relaxed text-luxury-silver/70 sm:text-lg"
          >
            Scan the QR code or enter serial number to verify authenticity and view provenance
            details
          </motion.p>

          <motion.div
            data-hero
            className="relative z-20 flex flex-col items-center gap-3 sm:flex-row sm:justify-center sm:items-center"
          >
            <motion.button
              type="button"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleOpenScanner}
              className="group relative z-20 inline-flex w-full items-center justify-center gap-2 rounded-full bg-luxury-gold px-8 py-3.5 text-sm font-semibold text-black transition-all hover:bg-luxury-lightGold sm:w-auto cursor-pointer active:scale-95"
            >
              <QrCode className="h-4 w-4" />
              Scan QR Code
            </motion.button>

            <span className="relative z-20 text-sm text-white/40 font-light">or</span>

            <motion.button
              type="button"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleOpenManualInput}
              className="relative z-20 inline-flex w-full items-center justify-center gap-2 rounded-full border border-white/20 bg-white/5 px-8 py-3.5 text-sm font-semibold text-white transition-all hover:border-white/30 hover:bg-white/10 sm:w-auto cursor-pointer active:scale-95"
            >
              <Search className="h-4 w-4" />
              Enter Serial
            </motion.button>
          </motion.div>
        </div>
      </section>

      {/* CTA Section - How to Verify */}
      <CTASection />

      {/* Verification Workflow Section */}
      <section
        data-verification-section
        ref={(element) => {
          sectionsRef.current[1] = element as HTMLDivElement | null;
        }}
        className="relative overflow-hidden border-t border-white/10 bg-gradient-to-b from-luxury-black/50 via-luxury-black to-luxury-black/50 py-24 px-6 md:py-32"
      >
        {/* Background Decoration */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(212,175,55,0.03)_0%,transparent_70%)]" />

        <div className="relative z-10 mx-auto max-w-6xl">
          {/* Section Header with Animation */}
          <motion.div
            className="mb-20 text-center"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
          >
            <h2 className="mb-4 text-4xl font-light text-white md:text-5xl">
              Verification{" "}
              <span className="bg-gradient-to-r from-luxury-gold to-luxury-lightGold bg-clip-text font-semibold text-transparent">
                Process
              </span>
            </h2>
            <p className="mx-auto max-w-2xl text-base text-luxury-silver/70 md:text-lg">
              Simple four-step verification for your Silver King bar
            </p>
          </motion.div>

          {/* Workflow Timeline */}
          <WorkflowTimeline />
        </div>
      </section>

      {/* Scanner Modal */}
      <AnimatePresence>
        {showScanner && (
          <motion.div
            key="scanner-modal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm p-6"
            onClick={() => {
              console.log("Closing scanner from backdrop");
              setShowScanner(false);
            }}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              onClick={(e) => {
                e.stopPropagation();
              }}
              className="relative z-[10000] w-full max-w-md"
            >
              {showScanner && (
                <Scanner
                  key={`scanner-${showScanner}`}
                  onScanSuccess={handleScanSuccess}
                  onClose={() => {
                    console.log("Closing scanner from component");
                    setShowScanner(false);
                  }}
                />
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Manual Input Modal */}
      <AnimatePresence mode="wait">
        {showManualInput && (
          <motion.div
            key="manual-input-modal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-md p-6"
            onClick={() => {
              setShowManualInput(false);
              setSerialNumber("");
            }}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md"
            >
              <div className="relative rounded-3xl border border-white/10 bg-gradient-to-br from-white/5 via-white/[0.03] to-transparent p-8 backdrop-blur-xl shadow-[0_20px_70px_-30px_rgba(0,0,0,0.7)]">
                {/* Close button */}
                <button
                  onClick={() => {
                    setShowManualInput(false);
                    setSerialNumber("");
                  }}
                  className="absolute top-4 right-4 rounded-full bg-black/50 p-2 text-white/80 hover:text-white hover:bg-black/70 transition-all"
                >
                  <X className="h-5 w-5" />
                </button>

                <h2 className="mb-6 text-2xl font-semibold text-white">Enter Serial Number</h2>
                <div className="mb-6 flex gap-3">
                  <input
                    type="text"
                    value={serialNumber}
                    onChange={(e) => setSerialNumber(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleManualVerify()}
                    placeholder="e.g., SKA000001"
                    className="flex-1 rounded-lg border border-white/20 bg-white/5 px-4 py-3 font-mono text-sm text-white placeholder:text-white/40 focus:border-luxury-gold focus:outline-none focus:ring-2 focus:ring-luxury-gold/30"
                    autoFocus
                  />
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleManualVerify}
                    disabled={isVerifying || !serialNumber.trim()}
                    className="rounded-lg bg-gradient-to-r from-luxury-gold to-luxury-lightGold px-6 py-3 text-sm font-semibold text-black transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isVerifying ? "Verifying..." : "Verify"}
                  </motion.button>
                </div>
                <p className="text-xs text-white/50 text-center">
                  Enter the serial number found on your Silver King bar
                </p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Verification Modal - Only show when not in manual input mode */}
      {!showManualInput && (
        <VerificationModal
          isOpen={isVerifying || !!verificationData}
          onClose={() => {
            setVerificationData(null);
            setSerialNumber("");
          }}
          data={verificationData}
          isVerifying={isVerifying}
        />
      )}

      {/* Benefits Section */}
      {!verificationData && !showManualInput && (
        <section
          ref={(element) => {
            sectionsRef.current[2] = element as HTMLDivElement | null;
          }}
          className="relative overflow-hidden border-t border-white/5 py-20 px-6"
        >
          <div className="relative z-10 mx-auto max-w-5xl">
            <div className="mb-12 text-center">
              <h2 className="mb-3 text-3xl font-light text-white md:text-4xl">
                Why{" "}
                <span className="bg-gradient-to-r from-luxury-gold to-luxury-lightGold bg-clip-text font-semibold text-transparent">
                  Verify?
                </span>
              </h2>
              <p className="text-sm text-luxury-silver/60 md:text-base">
                Complete traceability for every Silver King bar
              </p>
            </div>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0 }}
                className="group cursor-default rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm transition-all hover:border-luxury-gold/40 hover:bg-white/10"
              >
                <div className="mb-4 inline-flex rounded-xl bg-luxury-gold/10 p-3">
                  <Sparkles className="h-5 w-5 text-luxury-gold" />
                </div>
                <h3 className="mb-2 text-lg font-semibold text-white">Authenticity</h3>
                <p className="text-sm text-luxury-silver/70 leading-relaxed">
                  Verify genuine Silver King products instantly
                </p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.1 }}
                className="group cursor-default rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm transition-all hover:border-luxury-gold/40 hover:bg-white/10"
              >
                <div className="mb-4 inline-flex rounded-xl bg-luxury-silver/10 p-3">
                  <QrCode className="h-5 w-5 text-luxury-silver" />
                </div>
                <h3 className="mb-2 text-lg font-semibold text-white">Traceability</h3>
                <p className="text-sm text-luxury-silver/70 leading-relaxed">
                  Complete provenance and manufacturing details
                </p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.2 }}
                className="group cursor-default rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm transition-all hover:border-luxury-gold/40 hover:bg-white/10"
              >
                <div className="mb-4 inline-flex rounded-xl bg-luxury-gold/10 p-3">
                  <Shield className="h-5 w-5 text-luxury-gold" />
                </div>
                <h3 className="mb-2 text-lg font-semibold text-white">Security</h3>
                <p className="text-sm text-luxury-silver/70 leading-relaxed">
                  Encrypted QR codes prevent counterfeiting
                </p>
              </motion.div>
            </div>
          </div>
        </section>
      )}

      {/* Footer Section */}
      <AnimatePresence>
        <motion.section
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="relative border-t border-white/10 px-6 md:px-8 lg:px-12 py-16 md:py-20"
        >
          <div className="relative z-10 mx-auto w-full max-w-[1320px] flex flex-col md:flex-row items-start md:items-end justify-between gap-8 md:gap-0">
            {/* Left: Navigation Links */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
              className="flex flex-wrap items-center gap-6 md:gap-8"
            >
              <span className="text-white/40 text-sm">×</span>
              <Link
                href="/what-we-do"
                className="text-sm md:text-base font-medium text-white/80 hover:text-white transition-colors duration-300"
              >
                What we do
              </Link>
              <Link
                href="/authenticity"
                className="text-sm md:text-base font-medium text-white/80 hover:text-white transition-colors duration-300"
              >
                Authenticity
              </Link>
              <Link
                href="/products"
                className="text-sm md:text-base font-medium text-white/80 hover:text-white transition-colors duration-300"
              >
                Products
              </Link>
              <Link
                href="/about"
                className="text-sm md:text-base font-medium text-white/80 hover:text-white transition-colors duration-300"
              >
                About us
              </Link>
            </motion.div>

            {/* Right: Social Media Icons */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
              className="flex items-center gap-4 md:gap-5"
            >
              <a
                href="https://github.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-white/80 hover:text-white transition-colors duration-300"
                aria-label="GitHub"
              >
                <Github className="h-5 w-5 md:h-6 md:w-6" />
              </a>
              <a
                href="https://instagram.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-white/80 hover:text-white transition-colors duration-300"
                aria-label="Instagram"
              >
                <Instagram className="h-5 w-5 md:h-6 md:w-6" />
              </a>
              <a
                href="https://twitter.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-white/80 hover:text-white transition-colors duration-300"
                aria-label="Twitter"
              >
                <Twitter className="h-5 w-5 md:h-6 md:w-6" />
              </a>
              <a
                href="https://linkedin.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-white/80 hover:text-white transition-colors duration-300"
                aria-label="LinkedIn"
              >
                <Linkedin className="h-5 w-5 md:h-6 md:w-6" />
              </a>
              <a
                href="https://youtube.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-white/80 hover:text-white transition-colors duration-300"
                aria-label="YouTube"
              >
                <Youtube className="h-5 w-5 md:h-6 md:w-6" />
              </a>
            </motion.div>
          </div>

          {/* Copyright */}
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="mt-12 text-center"
          >
            <p className="text-xs font-extralight text-white/25 tracking-[0.1em] uppercase">
              © {new Date().getFullYear()} {APP_NAME}. All rights reserved.
            </p>
          </motion.div>
        </motion.section>
      </AnimatePresence>
    </div>
  );
}
