"use client";

import { useState, useLayoutEffect, useEffect } from "react";
import Navbar from "@/components/layout/Navbar";
import HeroSection from "@/components/sections/HeroSection";
import SplashScreen from "@/components/sections/SplashScreen";

export default function RootPageContent() {
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
      <div
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 9999,
          opacity: !isClient || showSplash ? 1 : 0,
          pointerEvents: !isClient || showSplash ? "auto" : "none",
          transition: "opacity 0.3s ease-out",
        }}
      >
        <SplashScreen onComplete={handleSplashComplete} />
      </div>

      {/* Main Content - Always render, control visibility */}
      <div
        style={{
          opacity: isClient && !showSplash ? 1 : 0,
          transition: "opacity 0.3s ease-in",
          pointerEvents: isClient && !showSplash ? "auto" : "none",
        }}
      >
        <Navbar />
        <main className="min-h-screen bg-black">
          <HeroSection shouldAnimate={splashComplete} />
        </main>
      </div>
    </>
  );
}

