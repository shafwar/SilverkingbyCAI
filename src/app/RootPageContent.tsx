"use client";

import { useState, useLayoutEffect, useEffect } from "react";
import Navbar from "@/components/layout/Navbar";
import { PersistentHomeHeroVideo } from "@/components/layout/PersistentHomeHeroVideo";
import HeroSection from "@/components/sections/HeroSection";
import SplashScreen from "@/components/sections/SplashScreen";

/** Max ms to wait for font before showing home content (avoid wrong font flash) */
const FONT_READY_TIMEOUT_MS = 2500;

export default function RootPageContent() {
  // Initialize with true to prevent flash - splash shows FIRST
  const [showSplash, setShowSplash] = useState<boolean>(true);
  const [splashComplete, setSplashComplete] = useState(false);
  const [fontsReady, setFontsReady] = useState(false);
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

  // Show home content only after fonts are ready (Geist loaded) so fallback font is never visible
  useEffect(() => {
    if (!splashComplete || typeof document === "undefined") return;
    let cancelled = false;
    Promise.race([
      document.fonts.ready,
      new Promise<void>((r) => setTimeout(r, FONT_READY_TIMEOUT_MS)),
    ]).then(() => {
      if (!cancelled) setFontsReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, [splashComplete]);

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
        console.warn("[RootPageContent] sessionStorage error:", error);
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
        console.warn("[RootPageContent] sessionStorage set error:", error);
      }
    }
    setShowSplash(false);
    setSplashComplete(true);
  };

  // Always render both splash and content to prevent hydration mismatch
  // Use opacity/visibility instead of conditional rendering
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

      {/* Hero video + edit icon only after splash complete */}
      <PersistentHomeHeroVideo splashComplete={splashComplete} />
      {/* Main Content - Visible only after splash + fonts ready (no fallback font flash) */}
      <div
        data-home-content
        className="font-sans"
        style={{
          opacity: isClient && !showSplash && fontsReady ? 1 : 0,
          transition: "opacity 0.3s ease-in",
          pointerEvents: isClient && !showSplash && fontsReady ? "auto" : "none",
          position: "relative",
          zIndex: 1,
        }}
      >
        <Navbar />
        <main className="min-h-screen bg-transparent">
          <HeroSection shouldAnimate={splashComplete} skipVideo />
        </main>
      </div>
    </>
  );
}

