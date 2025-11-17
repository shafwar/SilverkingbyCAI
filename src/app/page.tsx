"use client";

import { useState, useEffect, useLayoutEffect } from "react";
import Navbar from "@/components/layout/Navbar";
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
    setSplashComplete(true);
  };

  // Don't render anything until we know if splash should be shown (prevent flicker) 
  if (showSplash === null) {
    return (
      <div className="fixed inset-0 bg-black" />
    );
  }

  return (
    <>
      {/* Splash Screen - conditional render based on sessionStorage */}
      {showSplash && !splashComplete && (
        <SplashScreen onComplete={handleSplashComplete} />
      )}

      {/* Main content - hidden during splash with INSTANT opacity change */}
      <main
        className={`h-screen overflow-hidden bg-black ${
          splashComplete 
            ? "opacity-100 transition-opacity duration-500" 
            : "opacity-0 pointer-events-none"
        }`}
      >
        <Navbar />
        {/* Pass splashComplete as shouldAnimate trigger */}
        <HeroSection shouldAnimate={splashComplete} />
      </main>
    </>
  );
}
