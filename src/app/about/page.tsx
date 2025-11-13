"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { Sparkles, Shield, Award, Target } from "lucide-react";
import { APP_NAME } from "@/utils/constants";

export default function AboutPage() {
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
                href="/"
                className="text-luxury-silver hover:text-luxury-gold transition-colors duration-300"
              >
                Home
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
        <div className="max-w-4xl mx-auto text-center">
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="luxury-heading mb-6"
          >
            About Silver King
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-xl text-luxury-silver"
          >
            Crafting excellence in precious metals since our inception
          </motion.p>
        </div>
      </section>

      {/* Story Section */}
      <section className="py-20 px-4">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="luxury-card mb-12"
          >
            <h2 className="text-3xl font-serif font-bold text-luxury-gold mb-6">
              Our Story
            </h2>
            <div className="space-y-4 text-luxury-silver leading-relaxed">
              <p>
                Silver King by CAI represents the pinnacle of precious metal
                manufacturing. We specialize in creating luxury gold, silver, palladium,
                and custom silver bars that embody perfection in every detail.
              </p>
              <p>
                Our commitment to excellence is reflected in every product we create. With
                a purity guarantee of 99.99% on all our precious metals, we ensure that
                each piece meets the highest standards of quality and craftsmanship.
              </p>
              <p>
                Every Silver King product comes with a unique QR code verification system,
                allowing our customers to instantly verify the authenticity of their
                investment. This innovative approach combines traditional craftsmanship with
                modern technology.
              </p>
            </div>
          </motion.div>

          {/* Values Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="luxury-card text-center"
            >
              <Shield className="w-12 h-12 text-luxury-gold mx-auto mb-4" />
              <h3 className="text-xl font-serif font-bold text-luxury-gold mb-3">
                Authenticity
              </h3>
              <p className="text-luxury-silver text-sm">
                Every product is verified and certified with our advanced QR code system
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="luxury-card text-center"
            >
              <Award className="w-12 h-12 text-luxury-gold mx-auto mb-4" />
              <h3 className="text-xl font-serif font-bold text-luxury-gold mb-3">
                Excellence
              </h3>
              <p className="text-luxury-silver text-sm">
                99.99% purity guarantee on all precious metal products we manufacture
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="luxury-card text-center"
            >
              <Target className="w-12 h-12 text-luxury-gold mx-auto mb-4" />
              <h3 className="text-xl font-serif font-bold text-luxury-gold mb-3">
                Precision
              </h3>
              <p className="text-luxury-silver text-sm">
                Meticulous attention to detail in every step of the manufacturing process
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
          className="max-w-3xl mx-auto luxury-card text-center"
        >
          <h2 className="text-3xl font-serif font-bold text-luxury-gold mb-4">
            Experience the Difference
          </h2>
          <p className="text-luxury-silver mb-8">
            Join the kingdom of precious metal excellence
          </p>
          <Link href="/" className="luxury-button inline-block">
            Explore Our Products
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

