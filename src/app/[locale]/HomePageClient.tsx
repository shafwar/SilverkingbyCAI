"use client";

import { useState, useLayoutEffect, useEffect, useCallback } from "react";
import Navbar from "@/components/layout/Navbar";
import SplashScreen from "@/components/sections/SplashScreen";
import HeroSection from "@/components/sections/HeroSection";

export default function HomePageClient() {
  const [showSplash, setShowSplash] = useState(true);
  const [splashComplete, setSplashComplete] = useState(false);

  useEffect(() => {
    document.body.classList.add("home-page");
    return () => {
      document.body.classList.remove("home-page");
      document.body.classList.remove("splash-complete");
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
        document.body.classList.remove("splash-complete");
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
      {showSplash ? (
        <SplashScreen onComplete={handleSplashComplete} />
      ) : null}

      <div className="home-page-shell" aria-hidden={showSplash}>
        <Navbar />
        <main className="home-page-content relative min-h-screen overflow-hidden bg-transparent">
          <HeroSection shouldAnimate={splashComplete} priorityLcp={splashComplete} />
        </main>
      </div>
    </>
  );
}
