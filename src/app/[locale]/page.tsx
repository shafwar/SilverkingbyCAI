"use client";

import { useState, useLayoutEffect } from "react";
import HeroSection from "@/components/sections/HeroSection";
import SplashScreen from "@/components/sections/SplashScreen";

export default function HomePage() {
  // Check sessionStorage immediately (client-side only, no delay)
  const [showSplash, setShowSplash] = useState<boolean | null>(null);
  const [splashComplete, setSplashComplete] = useState(false);

  // IMMEDIATELY check if splash should be shown (no delay, no flicker)
  useLayoutEffect(() => {
    if (typeof window !== "undefined") {
      const splashShown = sessionStorage.getItem("splashShown");
      
      if (splashShown === "true") {
        // Skip splash entirely
        setShowSplash(false);
        setSplashComplete(true);
      } else {
        // Show splash
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

  // Show splash screen if needed
  if (showSplash === true) {
    return <SplashScreen onComplete={handleSplashComplete} />;
  }

  // Show main content
  return (
    <main className="min-h-screen bg-black">
      <HeroSection shouldAnimate={splashComplete} />
    </main>
  );
}
