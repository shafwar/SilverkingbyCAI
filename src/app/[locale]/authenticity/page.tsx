"use client";

import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { useTranslations, useLocale } from "next-intl";
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
  Instagram,
  Twitter,
  Linkedin,
  Youtube,
  X,
} from "lucide-react";
import Link from "next/link";
import Navbar from "@/components/layout/Navbar";
import { Scanner } from "@/components/shared/Scanner";
import { useRouter } from "next/navigation";
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

// workflowSteps will be created inside AuthenticityPage component using translations

function CTASection({ t }: { t: (key: string) => string }) {
  const scrollToVerification = () => {
    try {
      const verificationSection = document.querySelector("[data-verification-section]");
      if (verificationSection) {
        verificationSection.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    } catch (error) {
      console.error("Error scrolling to verification section:", error);
    }
  };

  return (
    <section className="relative  lg:mb-8 px-6 md:px-8 lg:px-12 py-20 md:py-6 lg:py-4 xl:py-2">
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
            className="group relative inline-flex flex-col items-center gap-2 text-white/60 hover:text-white transition-all duration-300 cursor-pointer"
            animate={{
              y: [0, -12, 0],
            }}
            transition={{
              duration: 7,
              repeat: Infinity,
              ease: "easeInOut",
            }}
            whileHover={{
              scale: 1.05,
              transition: { duration: 0.3 },
            }}
          >
            {/* Subtle glow effect */}
            <motion.div
              className="absolute inset-0 rounded-full bg-white/5 blur-xl"
              animate={{
                opacity: [0.3, 0.6, 0.3],
                scale: [1, 1.2, 1],
              }}
              transition={{
                duration: 2.5,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            />

            <motion.span
              className="relative z-10 text-sm md:text-base font-light tracking-wide"
              animate={{
                opacity: [0.6, 1, 0.6],
              }}
              transition={{
                duration: 2.5,
                repeat: Infinity,
                ease: "easeInOut",
                delay: 0.2,
              }}
            >
              {t("learnProcess")}
            </motion.span>

            <motion.div
              className="relative z-10"
              animate={{
                y: [0, 4, 0],
                opacity: [0.7, 1, 0.7],
              }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                ease: "easeInOut",
                delay: 0.1,
              }}
            >
              <ArrowDown className="h-4 w-4 md:h-5 md:w-5 transition-transform duration-300 group-hover:translate-y-1" />
            </motion.div>
          </motion.button>
        </motion.div>
      </div>
    </section>
  );
}

// WorkflowTimeline - NO BLOCKING ANIMATIONS
function WorkflowTimeline({
  steps,
}: {
  steps: Array<{ id: number; title: string; description: string; icon: any }>;
}) {
  const timelineRef = useRef<HTMLDivElement>(null);
  const pathRef = useRef<SVGPathElement>(null);
  const pathMobileRef = useRef<SVGPathElement>(null);
  const [activeStep, setActiveStep] = useState<number | null>(null);

  // Optional animation - won't block rendering
  useGSAP(
    () => {
      if (!timelineRef.current) return;

      const ctx = gsap.context(() => {
        // Animate desktop path drawing - OPTIONAL
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

        // Animate mobile path drawing - OPTIONAL
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
      }, timelineRef);

      return () => ctx.revert();
    },
    { scope: timelineRef }
  );

  return (
    <div ref={timelineRef} className="relative">
      {/* SVG Path - Desktop - ALWAYS VISIBLE */}
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

      {/* SVG Path - Mobile - ALWAYS VISIBLE */}
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

      {/* Steps - NO BLOCKING ANIMATIONS, ALWAYS VISIBLE */}
      <div className="relative space-y-12 md:space-y-20">
        {steps.map((step, index) => {
          const Icon = step.icon;
          const isEven = index % 2 === 0;

          return (
            <div
              key={step.id}
              className={`relative flex items-center gap-8 ${
                isEven ? "md:flex-row" : "md:flex-row-reverse"
              }`}
            >
              {/* Step Content - ALWAYS VISIBLE, NO ANIMATION BLOCKING */}
              <div
                className={`flex-1 pl-20 md:pl-0 ${isEven ? "md:pr-16 md:text-right" : "md:pl-16"}`}
                onMouseEnter={() => setActiveStep(index)}
                onMouseLeave={() => setActiveStep(null)}
              >
                <div
                  className={`group relative cursor-pointer rounded-3xl border transition-all duration-500 p-6 md:p-8 backdrop-blur-xl ${
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
                    <h3 className="mb-2 md:mb-3 text-lg md:text-2xl font-semibold text-white transition-colors group-hover:text-luxury-gold">
                      {step.title}
                    </h3>
                    <p className="text-xs md:text-sm text-luxury-silver/70 leading-relaxed transition-colors group-hover:text-luxury-silver/90">
                      {step.description}
                    </p>
                  </div>
                </div>
              </div>

              {/* Step Icon - ALWAYS VISIBLE */}
              <div className="absolute left-0 md:left-1/2 md:-translate-x-1/2 z-20">
                <div className="relative">
                  {/* Glowing Pulse Circle */}
                  <div className="absolute inset-0 -z-10 rounded-full bg-luxury-gold/30 blur-2xl" />

                  {/* Icon Circle */}
                  <div
                    className={`relative flex h-20 w-20 md:h-24 md:w-24 items-center justify-center rounded-full border-2 bg-gradient-to-br from-luxury-gold/20 via-luxury-gold/10 to-luxury-black shadow-[0_10px_30px_-10px_rgba(212,175,55,0.5)] backdrop-blur-sm transition-all duration-300 ${
                      activeStep === index
                        ? "border-luxury-gold/80 shadow-[0_0_40px_rgba(212,175,55,0.7)]"
                        : "border-luxury-gold/50"
                    }`}
                  >
                    <Icon className="h-8 w-8 md:h-10 md:w-10 text-luxury-gold" />
                  </div>

                  {/* Step Number Badge */}
                  <div className="absolute -bottom-1 -right-1 flex h-7 w-7 md:h-8 md:w-8 items-center justify-center rounded-full bg-gradient-to-br from-luxury-gold to-luxury-lightGold text-xs font-bold text-black shadow-lg">
                    {step.id}
                  </div>
                </div>
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
  const t = useTranslations("authenticity");

  const workflowSteps = [
    {
      id: 1,
      title: t("workflow.steps.step1.title"),
      description: t("workflow.steps.step1.description"),
      icon: QrCode,
    },
    {
      id: 2,
      title: t("workflow.steps.step2.title"),
      description: t("workflow.steps.step2.description"),
      icon: Camera,
    },
    {
      id: 3,
      title: t("workflow.steps.step3.title"),
      description: t("workflow.steps.step3.description"),
      icon: Shield,
    },
    {
      id: 4,
      title: t("workflow.steps.step4.title"),
      description: t("workflow.steps.step4.description"),
      icon: CheckCircle2,
    },
  ];
  const tNav = useTranslations("nav");
  const locale = useLocale();
  const [showScanner, setShowScanner] = useState(false);
  const [showManualInput, setShowManualInput] = useState(false);
  const [serialNumber, setSerialNumber] = useState("");
  const [isVideoLoaded, setIsVideoLoaded] = useState(false);
  const heroRef = useRef<HTMLDivElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const router = useRouter();

  useGSAP(
    () => {
      if (!heroRef.current) return;

      try {
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
      } catch (error) {
        console.error("GSAP animation error:", error);
      }
    },
    { scope: heroRef }
  );

  // Optimal video autoplay handling - ensure video never pauses or breaks
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    // Force play function with error handling and retry mechanism
    const forcePlay = async () => {
      try {
        if (video.paused && !video.ended) {
          await video.play();
        }
      } catch (error) {
        console.warn("[AuthenticityPage] Video autoplay prevented, retrying:", error);
        // Retry after a short delay with exponential backoff
        setTimeout(() => {
          video.play().catch(() => {
            // Second retry after longer delay
            setTimeout(() => {
              video.play().catch(() => {
                console.warn("[AuthenticityPage] Video autoplay failed after multiple retries");
              });
            }, 500);
          });
        }, 100);
      }
    };

    // Handle video ready states
    const handleCanPlay = () => {
      setIsVideoLoaded(true);
      forcePlay();
    };

    const handleLoadedData = () => {
      setIsVideoLoaded(true);
      forcePlay();
    };

    // Handle video errors
    const handleError = () => {
      setIsVideoLoaded(false);
      console.warn("[AuthenticityPage] Video error occurred");
    };

    // Resume video if it pauses (prevent breaks)
    const handlePause = () => {
      if (!video.ended) {
        // Small delay to avoid infinite loop
        setTimeout(() => {
          if (video.paused && !video.ended) {
            forcePlay();
          }
        }, 50);
      }
    };

    // Handle visibility change - resume video when page becomes visible
    const handleVisibilityChange = () => {
      if (!document.hidden && video.paused && !video.ended) {
        forcePlay();
      }
    };

    // Handle video end - restart immediately for seamless loop
    const handleEnded = () => {
      video.currentTime = 0;
      forcePlay();
    };

    // Handle video waiting/buffering - resume when ready
    const handleWaiting = () => {
      // Video is buffering, will resume automatically when ready
      // But we can also try to play if it's paused
      if (video.paused && !video.ended) {
        setTimeout(() => {
          forcePlay();
        }, 100);
      }
    };

    // Check if video is already loaded
    if (video.readyState >= 2) {
      setIsVideoLoaded(true);
    }

    // Initial play attempt
    forcePlay();

    // Event listeners
    video.addEventListener("canplay", handleCanPlay);
    video.addEventListener("loadeddata", handleLoadedData);
    video.addEventListener("error", handleError);
    video.addEventListener("pause", handlePause);
    video.addEventListener("ended", handleEnded);
    video.addEventListener("waiting", handleWaiting);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    // Force load video to ensure it starts loading immediately
    video.load();

    // Periodic check to ensure video is playing (fallback mechanism)
    const playCheckInterval = setInterval(() => {
      if (video.paused && !video.ended && !document.hidden) {
        forcePlay();
      }
    }, 2000); // Check every 2 seconds

    // Cleanup
    return () => {
      video.removeEventListener("canplay", handleCanPlay);
      video.removeEventListener("loadeddata", handleLoadedData);
      video.removeEventListener("error", handleError);
      video.removeEventListener("pause", handlePause);
      video.removeEventListener("ended", handleEnded);
      video.removeEventListener("waiting", handleWaiting);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      clearInterval(playCheckInterval);
    };
  }, []);

  const handleScanSuccess = async (decodedText: string) => {
    try {
      console.log("[Authenticity] QR code scanned:", decodedText);

      if (!decodedText || !decodedText.trim()) {
        console.error("[Authenticity] Empty QR code scanned");
        return;
      }

      // Close scanner first
      setShowScanner(false);

      // Extract serial code from URL if QR code contains full URL
      let serialCode = decodedText.trim();

      // Handle different QR code formats
      if (serialCode.includes("/verify/")) {
        // Extract serial code from URL: https://cahayasilverking.id/verify/SKA000001
        const urlMatch = serialCode.match(/\/verify\/([A-Z0-9]+)/i);
        if (urlMatch && urlMatch[1]) {
          serialCode = urlMatch[1];
          console.log("[Authenticity] Extracted serial from URL:", serialCode);
        }
      } else if (serialCode.includes("http")) {
        // Try to extract from any URL format
        const urlParts = serialCode.split("/");
        serialCode = urlParts[urlParts.length - 1] || serialCode;
        console.log("[Authenticity] Extracted serial from HTTP URL:", serialCode);
      }

      // Normalize serial to uppercase and remove invalid characters
      const normalizedSerial = serialCode.toUpperCase().replace(/[^A-Z0-9]/g, "");

      console.log("[Authenticity] Normalized serial:", normalizedSerial);

      if (!normalizedSerial || normalizedSerial.length < 3) {
        alert("Invalid QR code format. Please scan a valid Silver King QR code.");
        return;
      }

      // Navigate to verify page - use window.location for maximum reliability
      // This ensures it works exactly like camera scanning
      const verifyUrl = `/verify/${normalizedSerial}`;
      console.log("[Authenticity] Navigating to:", verifyUrl);

      // Use window.location.href for most reliable navigation (same as camera scan)
      window.location.href = verifyUrl;
    } catch (error) {
      console.error("[Authenticity] Error handling scan success:", error);
      setShowScanner(false);
      alert("Failed to process QR code. Please try again.");
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
    try {
      if (!serialNumber.trim()) {
        alert("Please enter a serial number");
        return;
      }

      // Normalize serial code
      let serialCode = serialNumber
        .trim()
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, "");

      console.log("[Authenticity] Manual verify - serial code:", serialCode);

      if (!serialCode || serialCode.length < 3) {
        alert("Invalid serial number format. Please enter a valid serial code (e.g., SKA000001)");
        return;
      }

      // Close modal first
      setShowManualInput(false);
      setSerialNumber("");

      // Navigate to verify page - use window.location for maximum reliability
      // This ensures it works exactly like camera scanning
      const verifyUrl = `/verify/${serialCode}`;
      console.log("[Authenticity] Manual verify - navigating to:", verifyUrl);

      // Use window.location.href for most reliable navigation (same as camera scan)
      window.location.href = verifyUrl;
    } catch (error) {
      console.error("[Authenticity] Error in handleManualVerify:", error);
      alert("Failed to verify. Please try again.");
    }
  };

  const pageRef = useRef<HTMLDivElement>(null);
  const sectionsRef = useRef<(HTMLDivElement | null)[]>([]);

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
          <div className="absolute inset-0 bg-gradient-to-br from-luxury-black via-luxury-black/95 to-luxury-black z-0" />

          <video
            ref={videoRef}
            autoPlay
            loop
            muted
            playsInline
            preload="auto"
            disablePictureInPicture
            disableRemotePlayback
            className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-1000 will-change-transform z-10 ${
              isVideoLoaded ? "opacity-100" : "opacity-0"
            }`}
            style={{
              transform: "scale(1.05)",
              transformOrigin: "center center",
            }}
          >
            <source src={getR2UrlClient("/videos/hero/mobile scanning qr.mp4")} type="video/mp4" />
          </video>

          <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/50 to-black/70 z-20" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,rgba(10,10,10,0.6)_100%)] z-20" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_30%,rgba(0,0,0,0.8)_100%)] z-20" />
          <div className="absolute inset-x-0 bottom-0 h-40 md:h-52 lg:h-64 bg-gradient-to-t from-luxury-black via-luxury-black/60 to-transparent pointer-events-none z-20" />
        </div>

        {/* Minimal Particles */}
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
            className="mb-4 text-4xl font-sans font-light leading-tight text-white sm:text-5xl md:text-6xl"
          >
            {t("authenticateYour")}
            <span className="block bg-gradient-to-r from-luxury-gold to-luxury-lightGold bg-clip-text font-sans font-semibold text-transparent">
              {t("silverKingBar")}
            </span>
          </motion.h1>

          <motion.p
            data-hero
            className="mx-auto mb-8 max-w-xl text-base leading-relaxed text-luxury-silver/70 sm:text-lg"
          >
            {t("heroDescription")}
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
              {t("scanQR")}
            </motion.button>

            <span className="relative z-20 text-sm text-white/40 font-light">{t("or")}</span>

            <motion.button
              type="button"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleOpenManualInput}
              className="relative z-20 inline-flex w-full items-center justify-center gap-2 rounded-full border border-white/20 bg-white/5 px-8 py-3.5 text-sm font-semibold text-white transition-all hover:border-white/30 hover:bg-white/10 sm:w-auto cursor-pointer active:scale-95"
            >
              <Search className="h-4 w-4" />
              {t("enterSerial")}
            </motion.button>
          </motion.div>
        </div>
      </section>

      <CTASection t={t} />

      {/* Verification Workflow Section - ALWAYS VISIBLE */}
      <section
        data-verification-section
        ref={(element) => {
          sectionsRef.current[1] = element as HTMLDivElement | null;
        }}
        className="relative overflow-hidden border-t border-white/10 bg-gradient-to-b from-luxury-black/50 via-luxury-black to-luxury-black/50 py-24 px-6 md:py-32"
      >
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(212,175,55,0.03)_0%,transparent_70%)]" />

        <div className="relative z-10 mx-auto max-w-6xl">
          <motion.div
            className="mb-20 text-center"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
          >
            <h2 className="mb-4 text-4xl font-light text-white md:text-5xl">
              {t("workflow.title")}{" "}
              <span className="bg-gradient-to-r from-luxury-gold to-luxury-lightGold bg-clip-text font-semibold text-transparent">
                {t("workflow.titleBold")}
              </span>
            </h2>
            <p className="mx-auto max-w-2xl text-base text-luxury-silver/70 md:text-lg">
              {t("workflow.subtitle")}
            </p>
          </motion.div>

          <WorkflowTimeline steps={workflowSteps} />
        </div>
      </section>

      {/* Scanner Modal */}
      <AnimatePresence mode="wait">
        {showScanner && (
          <motion.div
            key="scanner-modal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 z-[9999] flex items-start justify-center bg-black/80 backdrop-blur-sm p-6 pt-20 md:pt-24"
            onClick={() => {
              console.log("[Authenticity] Closing scanner from backdrop");
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
              <Scanner
                key="scanner-component"
                onScanSuccess={handleScanSuccess}
                onClose={() => {
                  console.log("[Authenticity] Closing scanner from component");
                  setShowScanner(false);
                }}
              />
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
                <button
                  onClick={() => {
                    setShowManualInput(false);
                    setSerialNumber("");
                  }}
                  className="absolute top-4 right-4 rounded-full bg-black/50 p-2 text-white/80 hover:text-white hover:bg-black/70 transition-all"
                >
                  <X className="h-5 w-5" />
                </button>

                <h2 className="mb-6 text-2xl font-semibold text-white">{t("enterSerialNumber")}</h2>
                <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:gap-3">
                  <input
                    type="text"
                    value={serialNumber}
                    onChange={(e) => setSerialNumber(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleManualVerify()}
                    placeholder={t("enterSerialPlaceholder")}
                    className="w-full flex-1 rounded-xl border border-white/20 bg-white/5 px-4 py-3.5 font-mono text-sm text-white placeholder:text-white/40 focus:border-luxury-gold focus:outline-none focus:ring-2 focus:ring-luxury-gold/30 transition-all"
                    autoFocus
                  />
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleManualVerify}
                    disabled={!serialNumber.trim()}
                    className="w-full sm:w-auto sm:min-w-[120px] rounded-xl bg-gradient-to-r from-luxury-gold to-luxury-lightGold px-6 py-3.5 text-sm font-semibold text-black transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 hover:shadow-lg hover:shadow-luxury-gold/30 active:scale-95"
                  >
                    {t("verify")}
                  </motion.button>
                </div>
                <p className="text-xs text-white/50 text-center">{t("enterSerialHint")}</p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Benefits Section */}
      <section
        ref={(element) => {
          sectionsRef.current[2] = element as HTMLDivElement | null;
        }}
        className="relative overflow-hidden border-t border-white/5 py-20 px-6"
      >
        <div className="relative z-10 mx-auto max-w-5xl">
          <div className="mb-12 text-center">
            <h2 className="mb-3 text-3xl font-light text-white md:text-4xl">
              {t("benefits.title")}{" "}
              <span className="bg-gradient-to-r from-luxury-gold to-luxury-lightGold bg-clip-text font-semibold text-transparent">
                {t("benefits.titleBold")}
              </span>
            </h2>
            <p className="text-sm text-luxury-silver/60 md:text-base">{t("benefits.subtitle")}</p>
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
              <h3 className="mb-2 text-lg font-semibold text-white">
                {t("benefits.authenticity.title")}
              </h3>
              <p className="text-sm text-luxury-silver/70 leading-relaxed">
                {t("benefits.authenticity.description")}
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
              <h3 className="mb-2 text-lg font-semibold text-white">
                {t("benefits.traceability.title")}
              </h3>
              <p className="text-sm text-luxury-silver/70 leading-relaxed">
                {t("benefits.traceability.description")}
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
              <h3 className="mb-2 text-lg font-semibold text-white">
                {t("benefits.security.title")}
              </h3>
              <p className="text-sm text-luxury-silver/70 leading-relaxed">
                {t("benefits.security.description")}
              </p>
            </motion.div>
          </div>
        </div>
      </section>

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
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="flex flex-wrap items-center gap-6 md:gap-8"
            >
              <span className="text-white/40 text-sm">×</span>
              <Link
                href={`/${locale}/what-we-do`}
                className="text-sm md:text-base font-medium text-white/80 hover:text-white transition-colors duration-300"
              >
                {tNav("whatWeDo")}
              </Link>
              <Link
                href={`/${locale}/authenticity`}
                className="text-sm md:text-base font-medium text-white/80 hover:text-white transition-colors duration-300"
              >
                {tNav("authenticity")}
              </Link>
              <Link
                href={`/${locale}/products`}
                className="text-sm md:text-base font-medium text-white/80 hover:text-white transition-colors duration-300"
              >
                {tNav("products")}
              </Link>
              <Link
                href={`/${locale}/about`}
                className="text-sm md:text-base font-medium text-white/80 hover:text-white transition-colors duration-300"
              >
                {tNav("aboutUs")}
              </Link>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="flex items-center gap-4 md:gap-5"
            >
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
