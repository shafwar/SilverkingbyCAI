"use client";

import { useState, useEffect } from "react";
import Navbar from "@/components/layout/Navbar";
import HeroSection from "@/components/sections/HeroSection";
import SplashScreen from "@/components/sections/SplashScreen";

export default function HomePage() {
  const [splashComplete, setSplashComplete] = useState(false);
  const [showHero, setShowHero] = useState(false);

  useEffect(() => {
    // Check if splash has been shown in this session
    const splashShown = sessionStorage?.getItem("splashShown");

    if (splashShown === "true") {
      // Skip splash, show hero immediately
      setSplashComplete(true);
      // Small delay to ensure smooth transition
      setTimeout(() => {
        setShowHero(true);
      }, 100);
    }
  }, []);

  const handleSplashComplete = () => {
    if (typeof window !== "undefined") {
      sessionStorage.setItem("splashShown", "true");
    }
    setSplashComplete(true);
    // Trigger hero animations AFTER splash complete
    setTimeout(() => {
      setShowHero(true);
    }, 200);
  };

  return (
    <>
      {/* Splash Screen - only show if not completed yet */}
      {!splashComplete && <SplashScreen onComplete={handleSplashComplete} />}

      {/* Main content - always render for proper SSR */}
      <main
        className={`h-screen overflow-hidden bg-black transition-opacity duration-700 ${
          splashComplete ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
      >
        <Navbar />
        {/* Pass showHero prop to trigger animations */}
        <HeroSection shouldAnimate={showHero} />
      </main>
    </>
  );
}
