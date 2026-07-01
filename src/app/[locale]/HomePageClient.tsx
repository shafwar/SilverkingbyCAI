"use client";

import { useState, useLayoutEffect, useEffect, useCallback } from "react";
import Navbar from "@/components/layout/Navbar";
import SplashScreen from "@/components/sections/SplashScreen";
import HeroSection from "@/components/sections/HeroSection";

export default function HomePageClient() {
  const [showSplash, setShowSplash] = useState(false);
  const [splashComplete, setSplashComplete] = useState(true);

  useEffect(() => {
    document.body.classList.add("home-page");
    return () => {
      document.body.classList.remove("home-page");
    };
  }, []);

  useLayoutEffect(() => {
    try {
      const splashShown = sessionStorage.getItem("splashShown") === "true";
      if (splashShown) {
        setShowSplash(false);
        setSplashComplete(true);
        document.body.classList.add("splash-complete");
      } else {
        setShowSplash(true);
        setSplashComplete(false);
      }
    } catch {
      setShowSplash(false);
      setSplashComplete(true);
      document.body.classList.add("splash-complete");
    }
  }, []);

  const handleSplashComplete = useCallback(() => {
    try {
      sessionStorage.setItem("splashShown", "true");
    } catch {
      /* ignore */
    }
    document.body.classList.add("splash-complete");
    setShowSplash(false);
    setSplashComplete(true);
  }, []);

  return (
    <>
      <Navbar />
      <main className="home-page-content relative min-h-screen overflow-hidden bg-transparent">
        <HeroSection shouldAnimate={splashComplete} priorityLcp />
      </main>

      {showSplash ? (
        <div className="fixed inset-0 z-[9999] pointer-events-auto">
          <SplashScreen onComplete={handleSplashComplete} />
        </div>
      ) : null}
    </>
  );
}
