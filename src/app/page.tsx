"use client";

import HeroSection from "@/components/sections/HeroSection";
import { motion } from "framer-motion";
import Link from "next/link";
import { Shield, Sparkles, Award, ArrowRight, Eye, QrCode } from "lucide-react";
import { APP_NAME } from "@/utils/constants";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-luxury-black">
      {/* Hero Section with Video Background */}
      <HeroSection />

      {/* Features Section */}
      <section className="relative py-24 md:py-32 px-6 overflow-hidden">
        <div className="mx-auto max-w-[1440px]">
          {/* Section Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="mb-16 text-center"
          >
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-light tracking-tight mb-4">
              <span className="text-white">Why Choose</span>{" "}
              <span className="bg-gradient-to-r from-luxury-gold to-luxury-lightGold bg-clip-text text-transparent">
                Silver King
              </span>
            </h2>
            <p className="text-lg md:text-xl text-luxury-silver/70 max-w-2xl mx-auto">
              Experience the pinnacle of precious metal authentication
            </p>
          </motion.div>

          {/* Features Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
            {[
              {
                icon: Shield,
                title: "Verified Authenticity",
                description:
                  "Each product comes with a unique QR code for instant verification and authenticity confirmation.",
                gradient: "from-emerald-500 to-teal-600",
              },
              {
                icon: Sparkles,
                title: "Premium Quality",
                description:
                  "99.99% purity guarantee on all our precious metal products, crafted with meticulous attention to detail.",
                gradient: "from-luxury-gold to-luxury-lightGold",
              },
              {
                icon: Award,
                title: "Luxury Craftsmanship",
                description:
                  "Custom designs and precision manufacturing make every piece a work of art worthy of your collection.",
                gradient: "from-luxury-silver to-white",
              },
            ].map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: index * 0.2 }}
                className="group relative"
              >
                <div className="relative h-full rounded-2xl border border-white/10 bg-gradient-to-br from-white/5 to-white/[0.02] p-8 backdrop-blur-sm transition-all duration-500 hover:border-white/20 hover:bg-white/10">
                  {/* Glow Effect */}
                  <div
                    className="absolute -inset-px rounded-2xl bg-gradient-to-br opacity-0 blur-xl transition-opacity duration-500 group-hover:opacity-20"
                    style={{
                      background: `linear-gradient(to bottom right, var(--tw-gradient-stops))`,
                    }}
                  />

                  <div className="relative z-10">
                    {/* Icon */}
                    <div
                      className={`mb-6 inline-flex rounded-2xl bg-gradient-to-br ${feature.gradient} p-4 shadow-lg`}
                    >
                      <feature.icon className="h-6 w-6 text-white" />
                    </div>

                    {/* Content */}
                    <h3 className="mb-3 text-2xl font-semibold text-white">{feature.title}</h3>
                    <p className="text-luxury-silver/80 leading-relaxed">{feature.description}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="relative py-24 md:py-32 px-6">
        <div className="mx-auto max-w-[1440px]">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mb-20 text-center"
          >
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-light tracking-tight mb-4">
              <span className="text-white">Simple. Secure.</span>{" "}
              <span className="bg-gradient-to-r from-luxury-gold to-luxury-silver bg-clip-text text-transparent">
                Verified.
              </span>
            </h2>
            <p className="text-lg md:text-xl text-luxury-silver/70 max-w-2xl mx-auto">
              Three steps to verify your precious metal&apos;s authenticity
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-12">
            {[
              {
                number: "01",
                icon: QrCode,
                title: "Scan QR Code",
                description:
                  "Simply scan the unique QR code on your product using your smartphone camera.",
              },
              {
                number: "02",
                icon: Eye,
                title: "Instant Verification",
                description:
                  "Our system instantly verifies the product's authenticity and displays detailed information.",
              },
              {
                number: "03",
                icon: Shield,
                title: "Guaranteed Authentic",
                description:
                  "Receive confirmation that your precious metal is 100% genuine and certified.",
              },
            ].map((step, index) => (
              <motion.div
                key={step.number}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: index * 0.2 }}
                className="relative"
              >
                {/* Connection Line (desktop only) */}
                {index < 2 && (
                  <div className="absolute left-full top-12 hidden h-0.5 w-12 bg-gradient-to-r from-luxury-gold/50 to-transparent md:block" />
                )}

                <div className="text-center">
                  {/* Number Badge */}
                  <div className="mb-6 inline-flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-luxury-gold/20 to-luxury-silver/20 border border-luxury-gold/30">
                    <span className="bg-gradient-to-br from-luxury-gold to-luxury-lightGold bg-clip-text text-3xl font-bold text-transparent">
                      {step.number}
                    </span>
                  </div>

                  {/* Icon */}
                  <div className="mb-4 flex justify-center">
                    <step.icon className="h-12 w-12 text-luxury-gold" />
                  </div>

                  {/* Content */}
                  <h3 className="mb-3 text-xl font-semibold text-white">{step.title}</h3>
                  <p className="text-luxury-silver/70 leading-relaxed">{step.description}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative py-24 md:py-32 px-6">
        <div className="mx-auto max-w-[1440px]">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="relative overflow-hidden rounded-3xl border border-luxury-gold/20 bg-gradient-to-br from-luxury-gold/10 via-transparent to-luxury-silver/10 p-12 md:p-16 lg:p-20"
          >
            {/* Background Pattern */}
            <div className="absolute inset-0 opacity-5">
              <div
                className="absolute inset-0"
                style={{
                  backgroundImage: `radial-gradient(circle at 1px 1px, rgba(212,175,55,0.3) 1px, transparent 0)`,
                  backgroundSize: "40px 40px",
                }}
              />
            </div>

            <div className="relative z-10 text-center">
              <h2 className="mb-6 text-4xl md:text-5xl lg:text-6xl font-light tracking-tight">
                <span className="text-white">Ready to verify</span>
                <br />
                <span className="bg-gradient-to-r from-luxury-gold via-luxury-lightGold to-luxury-silver bg-clip-text text-transparent">
                  your precious metals?
                </span>
              </h2>
              <p className="mx-auto mb-10 max-w-2xl text-lg md:text-xl text-luxury-silver/80">
                Join thousands of satisfied customers who trust Silver King for authentic, verified
                precious metals.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link
                  href="/verify"
                  className="group inline-flex items-center justify-center gap-3 rounded-full bg-gradient-to-r from-luxury-gold to-luxury-lightGold px-8 py-4 text-base font-semibold text-black transition-all duration-300 hover:scale-[1.02] hover:shadow-[0_20px_60px_-15px_rgba(212,175,55,0.5)]"
                >
                  <Shield className="h-5 w-5" />
                  <span>Start Verification</span>
                  <ArrowRight className="h-5 w-5 transition-transform duration-300 group-hover:translate-x-1" />
                </Link>

                <Link
                  href="/about"
                  className="inline-flex items-center justify-center gap-3 rounded-full border-2 border-luxury-silver/30 bg-white/5 px-8 py-4 text-base font-semibold text-white backdrop-blur-sm transition-all duration-300 hover:border-luxury-silver hover:bg-white/10"
                >
                  Learn More About Us
                </Link>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative border-t border-white/10 py-12 px-6">
        <div className="mx-auto max-w-[1440px] text-center">
          <p className="text-sm text-luxury-silver/60">
            © {new Date().getFullYear()} {APP_NAME}. All rights reserved.
          </p>
          <p className="mt-2 text-xs text-luxury-silver/40">The Art of Precious Metal Perfection</p>
        </div>
      </footer>
    </main>
  );
}
