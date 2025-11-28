"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { motion, useScroll, useTransform, type Variants } from "framer-motion";
import { gsap } from "gsap";
import { QrCode } from "lucide-react";
import { useTranslations } from "next-intl";
import ScrollingFeatures from "./ScrollingFeatures";
import { getR2UrlClient } from "@/utils/r2-url";

interface HeroSectionProps {
  shouldAnimate?: boolean;
}

const videoIntroVariants: Variants = {
  hidden: { opacity: 0, scale: 1.12, filter: "blur(16px)", rotateX: -8 },
  visible: {
    opacity: 1,
    scale: 1,
    filter: "blur(0px)",
    rotateX: 0,
    transition: { duration: 1.6, ease: [0.16, 1, 0.3, 1] },
  },
};

const gradientIntroVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { duration: 1.2, delay: 0.4, ease: "easeOut" },
  },
};

const secondaryGradientVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { duration: 1.4, delay: 0.6, ease: "easeOut" },
  },
};

const bubbleLayerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { duration: 1.1, delay: 0.8, ease: "easeOut" },
  },
};

const bubbleVariants: Variants = {
  hidden: { opacity: 0, scale: 0.6, y: 12, filter: "blur(18px)" },
  visible: (custom?: { delay?: number; duration?: number }) => {
    const delay = custom?.delay ?? 0;
    const duration = custom?.duration ?? 8;
    return {
      opacity: [0.15, 0.4, 0.18],
      scale: [0.85, 1.05, 0.92],
      y: [0, -16, 0],
      transition: {
        delay: 0.6 + delay,
        duration,
        ease: "easeInOut",
        repeat: Infinity,
      },
    };
  },
};

const bubbleOrbs = [
  {
    id: "orb-1",
    size: 220,
    top: "4%",
    left: "10%",
    delay: 0,
    duration: 9,
    gradient:
      "radial-gradient(circle at 30% 30%, rgba(255,255,255,0.45), rgba(255,255,255,0.05) 65%)",
  },
  {
    id: "orb-2",
    size: 180,
    top: "28%",
    left: "5%",
    delay: 0.3,
    duration: 7.5,
    gradient: "radial-gradient(circle at 60% 40%, rgba(255,215,0,0.35), rgba(255,215,0,0.05) 70%)",
  },
  {
    id: "orb-3",
    size: 260,
    top: "36%",
    left: "32%",
    delay: 0.5,
    duration: 8.5,
    gradient:
      "radial-gradient(circle at 40% 40%, rgba(255,255,255,0.35), rgba(255,255,255,0.05) 70%)",
  },
  {
    id: "orb-4",
    size: 140,
    top: "62%",
    left: "18%",
    delay: 0.2,
    duration: 7,
    gradient: "radial-gradient(circle at 50% 50%, rgba(255,215,0,0.25), rgba(255,215,0,0.04) 70%)",
  },
];

export default function HeroSection({ shouldAnimate = true }: HeroSectionProps) {
  const t = useTranslations("home.hero");
  const containerRef = useRef<HTMLDivElement>(null);
  const headlineRef = useRef<HTMLHeadingElement>(null);
  const subtitleRef = useRef<HTMLParagraphElement>(null);
  const statsRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  // Features data from translations
  const featuresData = [
    {
      label: t("features.chainOfCustody.label"),
      title: t("features.chainOfCustody.title"),
      body: t("features.chainOfCustody.body"),
    },
    {
      label: t("features.purityLab.label"),
      title: t("features.purityLab.title"),
      body: t("features.purityLab.body"),
    },
    {
      label: t("features.globalTrust.label"),
      title: t("features.globalTrust.title"),
      body: t("features.globalTrust.body"),
    },
  ];

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end start"],
  });

  const opacity = useTransform(scrollYProgress, [0, 0.5], [1, 0]);
  const scale = useTransform(scrollYProgress, [0, 0.5], [1, 1.05]);
  const videoOpacity = useTransform(scrollYProgress, [0, 0.3], [1, 0.3]);

  // Optimal video autoplay handling - ensure video never pauses or breaks
  useEffect(() => {
    setIsLoaded(true);
    
    const video = videoRef.current;
    if (!video) return;

    // Force play function with error handling and retry mechanism
    const forcePlay = async () => {
      try {
        if (video.paused && !video.ended) {
          await video.play();
        }
      } catch (error) {
        console.warn("[HeroSection] Video autoplay prevented, retrying:", error);
        // Retry after a short delay with exponential backoff
        setTimeout(() => {
          video.play().catch(() => {
            // Second retry after longer delay
            setTimeout(() => {
              video.play().catch(() => {
                console.warn("[HeroSection] Video autoplay failed after multiple retries");
              });
            }, 500);
          });
        }, 100);
      }
    };

    // Handle video ready states
    const handleCanPlay = () => {
      forcePlay();
    };

    const handleLoadedData = () => {
      forcePlay();
    };

    // Handle video errors
    const handleError = () => {
      console.warn("[HeroSection] Video error occurred");
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

  const animationState = shouldAnimate ? "visible" : "hidden";

  // SET INITIAL STATES IMMEDIATELY - NO FLICKER (useLayoutEffect runs BEFORE browser paint)
  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      // Headline words - hidden initially
      if (headlineRef.current) {
        const words = headlineRef.current.querySelectorAll(".word");
        gsap.set(words, {
          opacity: 0,
          y: 100,
          rotationX: -25,
          scale: 0.8,
          filter: "blur(10px)",
        });
      }

      // Subtitle - hidden initially
      if (subtitleRef.current) {
        gsap.set(subtitleRef.current, {
          opacity: 0,
          y: 50,
          clipPath: "polygon(0 0, 100% 0, 100% 0, 0 0)",
          filter: "blur(8px)",
        });
      }

      // Insight stack - hidden initially
      if (statsRef.current) {
        gsap.set(statsRef.current, { opacity: 0, x: 40 });

        const statItems = statsRef.current.querySelectorAll(".stat-item");
        gsap.set(statItems, {
          opacity: 0,
          x: 20,
          y: 10,
          filter: "blur(4px)",
        });
      }
    });

    return () => ctx.revert();
  }, []); // Run once on mount

  // ANIMATE WHEN shouldAnimate becomes true
  useEffect(() => {
    if (!shouldAnimate) return;

    const ctx = gsap.context(() => {
      const masterTL = gsap.timeline({
        defaults: {
          ease: "power4.out",
        },
      });

      // Headline words animation - START ALMOST IMMEDIATELY
      if (headlineRef.current) {
        const words = headlineRef.current.querySelectorAll(".word");
        masterTL.fromTo(
          words,
          {
            opacity: 0,
            y: 100,
            rotationX: -25,
            scale: 0.8,
            filter: "blur(10px)",
          },
          {
            opacity: 1,
            y: 0,
            rotationX: 0,
            scale: 1,
            filter: "blur(0px)",
            duration: 1.6,
            stagger: { amount: 1.0, from: "start", ease: "power3.inOut" },
            ease: "expo.out",
            transformOrigin: "center bottom",
          },
          0.1
        );
      }

      // Subtitle - FASTER
      masterTL.fromTo(
        subtitleRef.current,
        {
          opacity: 0,
          y: 50,
          clipPath: "polygon(0 0, 100% 0, 100% 0, 0 0)",
          filter: "blur(8px)",
        },
        {
          opacity: 1,
          y: 0,
          clipPath: "polygon(0 0, 100% 0, 100% 100%, 0 100%)",
          filter: "blur(0px)",
          duration: 1.4,
          ease: "expo.out",
        },
        1.0
      );

      // Insight container entrance
      masterTL.fromTo(
        statsRef.current,
        { opacity: 0, x: 40 },
        {
          opacity: 1,
          x: 0,
          duration: 1.4,
          ease: "power3.out",
        },
        0.5
      );

      // Insight rows cascade
      const statItems = statsRef.current?.querySelectorAll(".stat-item");
      if (statItems) {
        masterTL.fromTo(
          statItems,
          {
            opacity: 0,
            x: 20,
            y: 10,
            filter: "blur(4px)",
          },
          {
            opacity: 1,
            x: 0,
            y: 0,
            filter: "blur(0px)",
            duration: 1,
            stagger: {
              amount: 0.4,
              ease: "power2.out",
              from: "start",
            },
            ease: "power3.out",
          },
          1.0
        );
      }
    });

    return () => ctx.revert();
  }, [shouldAnimate]);

  return (
    <section ref={containerRef} className="relative h-screen w-full overflow-hidden bg-black">
      {/* Video Background */}
      <motion.div
        style={{ opacity: isLoaded ? videoOpacity : 0, scale }}
        className="absolute inset-0 z-0 will-change-transform overflow-hidden"
      >
        <motion.div
          className="absolute inset-0"
          variants={videoIntroVariants}
          initial="hidden"
          animate={animationState}
        >
          <video
            ref={videoRef}
            autoPlay
            loop
            muted
            playsInline
            preload="auto"
            disablePictureInPicture
            disableRemotePlayback
            className="absolute inset-0 h-full w-full object-cover"
          >
            <source src={getR2UrlClient("/videos/hero/hero-background.mp4")} type="video/mp4" />
          </video>
        </motion.div>

        <motion.div
          className="absolute inset-0 bg-gradient-to-b from-black/55 via-black/25 to-black/60"
          variants={gradientIntroVariants}
          initial="hidden"
          animate={animationState}
        />

        <motion.div
          className="absolute inset-0 bg-gradient-to-r from-black/65 via-transparent to-black/40"
          variants={secondaryGradientVariants}
          initial="hidden"
          animate={animationState}
        />

        <motion.div
          className="absolute inset-0 pointer-events-none z-[1]"
          variants={bubbleLayerVariants}
          initial="hidden"
          animate={animationState}
        >
          {bubbleOrbs.map((orb) => (
            <motion.span
              key={orb.id}
              className="absolute rounded-full blur-3xl opacity-70"
              style={{
                width: orb.size,
                height: orb.size,
                top: orb.top,
                left: orb.left,
                background: orb.gradient,
                mixBlendMode: "screen",
              }}
              variants={bubbleVariants}
              custom={{ delay: orb.delay, duration: orb.duration }}
              initial="hidden"
              animate={animationState}
            />
          ))}
        </motion.div>
      </motion.div>

      {/* Content - UNIVERSAL untuk SEMUA device mobile */}
      <div className="relative z-10 flex h-full items-center pt-[calc(env(safe-area-inset-top)+0.75rem)] sm:pt-8 md:pt-0 pb-[calc(env(safe-area-inset-bottom)+1rem)] sm:pb-16 md:pb-0">
        <div className="mx-auto w-full max-w-[1600px] px-4 sm:px-6 md:px-10 lg:px-14 xl:px-20">
          {/* Main content - Optimized untuk semua mobile */}
          <div className="max-w-[900px] -translate-y-2 sm:-translate-y-3 md:translate-y-0">
            {/* Headline - Universal responsive */}
            <h1
              ref={headlineRef}
              className="mb-2 sm:mb-3 md:mb-5 font-sans text-[1.7rem] sm:text-[2.25rem] md:text-[3rem] lg:text-[3.5rem] xl:text-[4rem] 2xl:text-[4.5rem] font-semibold tracking-tight md:tracking-[-0.03em] leading-[1.2] sm:leading-[1.2] md:leading-[1.25] text-white"
              style={{ perspective: "1000px" }}
            >
              {/* Fragment 1 */}
              <span
                className="word inline-block bg-[radial-gradient(circle_at_top,_#fff7c0,_#FFD700,_#AC7A00)] bg-clip-text text-transparent"
                style={{ transformStyle: "preserve-3d" }}
              >
                {t("headline1")}
              </span>{" "}
              <span
                className="word inline-block bg-[radial-gradient(circle_at_bottom,_#fff7c0,_#FFD700,_#AC7A00)] bg-clip-text text-transparent"
                style={{ transformStyle: "preserve-3d" }}
              >
                {t("headline2")}
              </span>{" "}
              {/* Fragment 2 */}
              <span className="word inline-block" style={{ transformStyle: "preserve-3d" }}>
                {t("headline3")}
              </span>{" "}
              <span
                className="word inline-block bg-gradient-to-r from-white via-[#E8E8E8] to-white bg-clip-text text-transparent"
                style={{ transformStyle: "preserve-3d" }}
              >
                {t("headline4")}
              </span>{" "}
              {/* Fragment 3 */}
              <span className="word inline-block" style={{ transformStyle: "preserve-3d" }}>
                {t("headline5")}
              </span>{" "}
              <span
                className="word inline-block bg-gradient-to-r from-[#C0C0C0] via-[#E8E8E8] to-[#C0C0C0] bg-clip-text text-transparent"
                style={{ transformStyle: "preserve-3d" }}
              >
                {t("headline6")}
              </span>
            </h1>

            {/* Subtitle - Universal responsive */}
            <p
              ref={subtitleRef}
              className="max-w-[92%] sm:max-w-[88%] md:max-w-[85%] font-sans text-[0.875rem] sm:text-[0.9375rem] md:text-[1rem] lg:text-[1.0625rem] leading-[1.65] sm:leading-[1.65] md:leading-[1.7] font-light text-white/75 mt-3.5 sm:mt-5 md:mt-0"
            >
              {t.rich("subtitle", {
                gold: (chunks) => <span className="font-medium text-white/90">{chunks}</span>,
                custom: (chunks) => <span className="font-medium text-white/90">{chunks}</span>,
                qr: (chunks) => <span className="font-medium text-white/90">{chunks}</span>,
              })}
            </p>
          </div>

          {/* Desktop: Insight stack */}
          <div className="hidden md:flex absolute right-3 lg:right-8 xl:right-12 top-1/2 -translate-y-1/2 pointer-events-auto z-20">
            <div ref={statsRef} className="flex flex-col gap-5 text-right items-end max-w-[360px]">
              {featuresData.map((item, index) => (
                <div key={item.label} className="stat-item relative pl-6">
                  <div className="absolute left-0 top-0 bottom-0 w-[1.5px] bg-gradient-to-b from-transparent via-white/25 to-transparent">
                    <div className="absolute -left-[2.5px] top-1.5 h-1.5 w-1.5 rounded-full bg-gradient-to-r from-white/60 to-white/20" />
                  </div>
                  <p className="font-sans text-[0.52rem] uppercase tracking-[0.45em] text-white/45">
                    {item.label}
                  </p>
                  <p className="mt-1 font-sans text-[1.05rem] font-semibold bg-gradient-to-r from-white via-white/80 to-white/60 bg-clip-text text-transparent tracking-tight leading-snug">
                    {item.title}
                  </p>
                  <p className="mt-1 font-sans text-[0.75rem] text-white/55 leading-relaxed">
                    {item.body}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Mobile: Scrolling Features - DINAIKKAN untuk proporsi dengan QR Card baru */}
      <div className="md:hidden absolute left-0 right-0 bottom-[calc(140px+env(safe-area-inset-bottom))] sm:bottom-[calc(148px+env(safe-area-inset-bottom))] z-20 px-4 sm:px-6">
        <ScrollingFeatures features={featuresData} shouldAnimate={shouldAnimate} />
      </div>

      {/* QR Card - SUPER SAFE POSITION untuk SEMUA device dan browser */}
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.97 }}
        animate={{
          opacity: shouldAnimate ? 1 : 0,
          y: shouldAnimate ? 0 : 20,
          scale: shouldAnimate ? 1 : 0.97,
        }}
        transition={{ duration: 1, delay: 1.1, ease: "easeOut" }}
        className="absolute bottom-[calc(50px+env(safe-area-inset-bottom))] sm:bottom-[calc(55px+env(safe-area-inset-bottom))] md:bottom-8 inset-x-0 z-30 flex justify-center px-3.5 sm:px-4"
      >
        <a
          href="/authenticity"
          className="group inline-flex items-center gap-2.5 sm:gap-3 text-left w-full max-w-[min(calc(100vw-28px),358px)] sm:max-w-[368px] backdrop-blur-sm bg-black/50 border border-white/10 rounded-2xl p-3 sm:p-3.5 transition-all duration-300 hover:bg-black/60 hover:border-white/20"
        >
          <div className="flex h-8 w-8 sm:h-9 sm:w-9 flex-shrink-0 items-center justify-center rounded-xl sm:rounded-2xl border border-white/20 bg-black/40">
            <QrCode className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[0.45rem] sm:text-[0.5rem] uppercase tracking-[0.4em] sm:tracking-[0.45em] text-white/55">
              {t("qrCard.label")}
            </p>
            <p className="mt-0.5 text-[0.75rem] sm:text-[0.8125rem] md:text-[0.95rem] font-semibold text-white tracking-tight leading-tight">
              {t("qrCard.title")}
            </p>
            <p className="mt-0.5 text-[0.6rem] sm:text-[0.625rem] text-white/60 leading-relaxed line-clamp-2">
              {t("qrCard.description")}
            </p>
          </div>
        </a>
      </motion.div>

      {/* Bottom Fade */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 2, delay: 1 }}
        className="absolute bottom-0 left-0 right-0 h-20 sm:h-24 md:h-36 bg-gradient-to-t from-black via-black/50 to-transparent pointer-events-none"
      />
    </section>
  );
}