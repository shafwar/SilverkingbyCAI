"use client";

import Navbar from "@/components/layout/Navbar";
import HeroSection from "@/components/sections/HeroSection";

export default function HomePage() {
  return (
    <main className="h-screen overflow-hidden bg-black">
      {/* Navbar - Pixelmatters Style */}
      <Navbar />

      {/* Hero Section - Fullscreen Only */}
      <HeroSection />
    </main>
  );
}
