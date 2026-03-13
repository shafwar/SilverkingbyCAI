"use client";

import { useState, useLayoutEffect, useEffect, Suspense } from "react";
import dynamic from "next/dynamic";
import { motion } from "framer-motion";
import { useTranslations } from "next-intl";
import { BookOpen } from "lucide-react";
import Navbar from "@/components/layout/Navbar";
import SplashScreen from "@/components/sections/SplashScreen";
import { PageLoadingSkeleton } from "@/components/ui/PageLoadingSkeleton";
import { OptimizedLink } from "@/components/ui/OptimizedLink";
// Lazy load HeroSection to improve initial page load
const HeroSection = dynamic(() => import("@/components/sections/HeroSection"), {
  loading: () => <PageLoadingSkeleton />,
  ssr: true, // Still SSR for SEO, but lazy load on client
});

export default function HomePageClient() {
  const t = useTranslations("home.journalTeaser");
  // Initialize with true to prevent flash - splash shows FIRST
  const [showSplash, setShowSplash] = useState<boolean>(true);
  const [splashComplete, setSplashComplete] = useState(false);
  const [isClient, setIsClient] = useState(false);

  // Add home-page class to body for CSS targeting
  useEffect(() => {
    if (typeof window !== "undefined") {
      document.body.classList.add("home-page");
      return () => {
        document.body.classList.remove("home-page");
      };
    }
  }, []);

  // IMMEDIATELY check if splash should be shown (BEFORE first render)
  useLayoutEffect(() => {
    setIsClient(true);
    if (typeof window !== "undefined") {
      try {
        const splashShown = sessionStorage.getItem("splashShown");
        
        if (splashShown === "true") {
          // Skip splash entirely - set immediately
          setShowSplash(false);
          setSplashComplete(true);
        } else {
          // Show splash - already set to true, no change needed
          setShowSplash(true);
        }
      } catch (error) {
        // Handle sessionStorage errors (e.g., in private browsing)
        console.warn("[HomePage] sessionStorage error:", error);
        setShowSplash(false);
        setSplashComplete(true);
      }
    }
  }, []);

  const handleSplashComplete = () => {
    if (typeof window !== "undefined") {
      try {
        sessionStorage.setItem("splashShown", "true");
      } catch (error) {
        console.warn("[HomePage] sessionStorage set error:", error);
      }
    }
    setShowSplash(false);
    setSplashComplete(true);
  };

  // Always render both splash and content to prevent hydration mismatch
  return (
    <>
      {/* Splash Screen - Always render, control visibility */}
      {(!isClient || showSplash) && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 9999,
            pointerEvents: "auto",
          }}
        >
          <SplashScreen onComplete={handleSplashComplete} />
        </div>
      )}

      {/* Main Content - Always render, control visibility */}
      <div
        style={{
          opacity: isClient && !showSplash ? 1 : 0,
          transition: "opacity 0.3s ease-in",
          pointerEvents: isClient && !showSplash ? "auto" : "none",
          position: "relative",
          zIndex: 1,
        }}
        className="home-page-content"
      >
        <Navbar />
        <main className="min-h-screen bg-transparent">
          <HeroSection shouldAnimate={splashComplete} skipVideo />
          {/* Journal teaser — subtle CTA on home, not in header */}
          <motion.section
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3, ease: "easeOut" }}
            className="relative z-10 px-4 sm:px-6 pb-12 sm:pb-16 pt-4 sm:pt-6 flex justify-center"
            aria-label={t("title")}
          >
            <OptimizedLink
              href="/journal"
              className="group flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 w-full max-w-xl rounded-2xl border border-white/10 bg-black/40 backdrop-blur-sm p-4 sm:p-5 transition-all duration-300 hover:bg-black/55 hover:border-amber-500/30 hover:shadow-[0_0_24px_rgba(245,158,11,0.08)]"
            >
              <div className="flex items-center gap-3 sm:flex-shrink-0">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-amber-500/25 bg-amber-500/10 text-amber-400/90 transition-colors group-hover:border-amber-500/40 group-hover:bg-amber-500/15">
                  <BookOpen className="h-5 w-5" />
                </div>
                <div className="sm:hidden">
                  <h3 className="font-sans text-sm font-semibold text-white tracking-tight">
                    {t("title")}
                  </h3>
                  <p className="mt-0.5 text-xs text-white/65 line-clamp-2">{t("description")}</p>
                </div>
              </div>
              <div className="hidden sm:block flex-1 min-w-0">
                <h3 className="font-sans text-sm font-semibold text-white tracking-tight">
                  {t("title")}
                </h3>
                <p className="mt-0.5 text-xs text-white/60 leading-relaxed">{t("description")}</p>
              </div>
              <span className="inline-flex items-center justify-center sm:flex-shrink-0 h-9 px-4 rounded-lg bg-amber-500/15 text-amber-400 text-sm font-medium border border-amber-500/25 transition-colors group-hover:bg-amber-500/25 group-hover:border-amber-500/40 group-hover:text-amber-300">
                {t("cta")}
              </span>
            </OptimizedLink>
          </motion.section>
        </main>
      </div>
    </>
  );
}

