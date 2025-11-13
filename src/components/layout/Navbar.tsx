"use client";

import Link from "next/link";
import { Sparkles } from "lucide-react";
import { APP_NAME } from "@/utils/constants";

export default function Navbar() {
  return (
    <nav className="fixed top-0 w-full z-50 bg-luxury-black/80 backdrop-blur-lg border-b border-luxury-silver/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-20">
          <Link href="/" className="flex items-center space-x-2">
            <Sparkles className="w-8 h-8 text-luxury-gold" />
            <span className="text-2xl font-serif font-bold text-luxury-gold">
              {APP_NAME}
            </span>
          </Link>
          <div className="flex items-center space-x-8">
            <Link
              href="/about"
              className="text-luxury-silver hover:text-luxury-gold transition-colors duration-300"
            >
              About
            </Link>
            <Link
              href="/verify"
              className="text-luxury-silver hover:text-luxury-gold transition-colors duration-300"
            >
              Verify
            </Link>
            <Link
              href="/dashboard/login"
              className="text-luxury-silver hover:text-luxury-gold transition-colors duration-300"
            >
              Admin
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
}

