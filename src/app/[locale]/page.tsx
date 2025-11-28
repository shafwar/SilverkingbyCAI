"use client";

import { useState, useLayoutEffect } from "react";
import HeroSection from "@/components/sections/HeroSection";
import SplashScreen from "@/components/sections/SplashScreen";

export default function HomePage() {
  // Initialize with true to prevent flash - splash shows FIRST
  const [showSplash, setShowSplash] = useState<boolean>(true);
  const [splashComplete, setSplashComplete] = useState(false);
  const [isClient, setIsClient] = useState(false);

  // IMMEDIATELY check if splash should be shown (BEFORE first render)
  useLayoutEffect(() => {
    setIsClient(true);
    if (typeof window !== "undefined") {
      const splashShown = sessionStorage.getItem("splashShown");
      
      if (splashShown === "true") {
        // Skip splash entirely - set immediately
        setShowSplash(false);
        setSplashComplete(true);
      } else {
        // Show splash - already set to true, no change needed
        setShowSplash(true);
      }
    }
  }, []);

  const handleSplashComplete = () => {
    if (typeof window !== "undefined") {
      sessionStorage.setItem("splashShown", "true");
    }
    setShowSplash(false);
    setSplashComplete(true);
  };

  // Show splash screen FIRST - before any content renders
  if (!isClient || showSplash) {
    return <SplashScreen onComplete={handleSplashComplete} />;
  }

  // Show main content
  return (
    <main className="min-h-screen bg-black">
      <HeroSection shouldAnimate={splashComplete} />
    </main>
  );
}
