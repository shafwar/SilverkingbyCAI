"use client";

import { useState, useLayoutEffect, useEffect } from "react";
import Navbar from "@/components/layout/Navbar";
import SplashScreen from "@/components/sections/SplashScreen";
import HeroSection from "@/components/sections/HeroSection";

export default function HomePageClient() {
  const [showSplash, setShowSplash] = useState<boolean>(true);
  const [splashComplete, setSplashComplete] = useState(false);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      document.body.classList.add("home-page");
      return () => {
        document.body.classList.remove("home-page");
      };
    }
  }, []);

  useLayoutEffect(() => {
    setIsClient(true);
    if (typeof window !== "undefined") {
      try {
        const splashShown = sessionStorage.getItem("splashShown");

        if (splashShown === "true") {
          setShowSplash(false);
          setSplashComplete(true);
        } else {
          setShowSplash(true);
        }
      } catch (error) {
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

  return (
    <>
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

      <div
        style={{
          opacity: isClient && !showSplash ? 1 : 0,
          transition: "opacity 0.22s ease-out",
          pointerEvents: isClient && !showSplash ? "auto" : "none",
          position: "relative",
          zIndex: 1,
        }}
        className="home-page-content"
      >
        <Navbar />
        <main className="min-h-screen bg-transparent overflow-hidden">
          <HeroSection shouldAnimate={splashComplete} skipVideo priorityLcp />
        </main>
      </div>
    </>
  );
}
