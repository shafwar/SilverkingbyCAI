"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { Shield, Sparkles, Award, ArrowRight } from "lucide-react";
import { APP_NAME } from "@/utils/constants";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-luxury-black">
      {/* Navigation */}
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
                href="/dashboard/login"
                className="text-luxury-silver hover:text-luxury-gold transition-colors duration-300"
              >
                Admin
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center"
          >
            <h1 className="luxury-heading mb-6">
              The Art of Precious Metal Perfection
            </h1>
            <p className="text-xl md:text-2xl text-luxury-silver max-w-3xl mx-auto mb-12">
              Silver King by CAI specializes in luxury precious metals — gold, silver,
              palladium, and custom silver bars crafted to perfection.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/verify"
                className="luxury-button inline-flex items-center justify-center gap-2"
              >
                Verify Product
                <Shield className="w-5 h-5" />
              </Link>
              <Link
                href="/about"
                className="px-6 py-3 bg-luxury-black border-2 border-luxury-gold text-luxury-gold font-semibold rounded-lg transition-all duration-300 hover:bg-luxury-gold hover:text-luxury-black"
              >
                Learn More
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="luxury-card text-center"
            >
              <Shield className="w-16 h-16 text-luxury-gold mx-auto mb-4" />
              <h3 className="text-2xl font-serif font-bold text-luxury-gold mb-3">
                Verified Authenticity
              </h3>
              <p className="text-luxury-silver">
                Each product comes with a unique QR code for instant verification and
                authenticity confirmation.
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="luxury-card text-center"
            >
              <Sparkles className="w-16 h-16 text-luxury-gold mx-auto mb-4" />
              <h3 className="text-2xl font-serif font-bold text-luxury-gold mb-3">
                Premium Quality
              </h3>
              <p className="text-luxury-silver">
                99.99% purity guarantee on all our precious metal products, crafted with
                meticulous attention to detail.
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="luxury-card text-center"
            >
              <Award className="w-16 h-16 text-luxury-gold mx-auto mb-4" />
              <h3 className="text-2xl font-serif font-bold text-luxury-gold mb-3">
                Luxury Craftsmanship
              </h3>
              <p className="text-luxury-silver">
                Custom designs and precision manufacturing make every piece a work of art
                worthy of your collection.
              </p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6 }}
          className="max-w-4xl mx-auto luxury-card text-center"
        >
          <h2 className="text-4xl font-serif font-bold text-luxury-gold mb-6">
            Verify Your Product
          </h2>
          <p className="text-xl text-luxury-silver mb-8">
            Scan the QR code on your Silver King product to instantly verify its
            authenticity and view detailed product information.
          </p>
          <Link
            href="/verify"
            className="luxury-button inline-flex items-center gap-2"
          >
            Start Verification
            <ArrowRight className="w-5 h-5" />
          </Link>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="border-t border-luxury-silver/10 py-12 px-4">
        <div className="max-w-7xl mx-auto text-center text-luxury-silver">
          <p className="text-sm">
            © {new Date().getFullYear()} {APP_NAME}. All rights reserved.
          </p>
          <p className="text-xs mt-2 text-luxury-silver/60">
            The Art of Precious Metal Perfection
          </p>
        </div>
      </footer>
    </div>
  );
}

