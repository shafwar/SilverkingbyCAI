"use client";

import { useEffect, useRef, useState } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { motion } from "framer-motion";
import Navbar from "@/components/layout/Navbar";
import {
  Mail,
  Phone,
  MapPin,
  Send,
  Instagram,
  Linkedin,
  Youtube,
  Github,
  Twitter,
  ArrowRight,
} from "lucide-react";

// Register GSAP plugins
if (typeof window !== "undefined") {
  try {
    gsap.registerPlugin(ScrollTrigger);
  } catch (error) {
    console.warn("GSAP ScrollTrigger registration failed:", error);
  }
}

const contactInfo = [
  {
    icon: Mail,
    label: "Email",
    value: "contact@cahayasilverking.id",
    href: "mailto:contact@cahayasilverking.id",
  },
  {
    icon: Phone,
    label: "Phone",
    value: "+62 XXX XXX XXXX",
    href: "tel:+62XXXXXXXXX",
  },
  {
    icon: MapPin,
    label: "Address",
    value: "Jakarta, Indonesia",
    href: "#",
  },
];

const socialLinks = [
  { icon: Instagram, href: "#", label: "Instagram" },
  { icon: Linkedin, href: "#", label: "LinkedIn" },
  { icon: Youtube, href: "#", label: "YouTube" },
  { icon: Twitter, href: "#", label: "Twitter" },
  { icon: Github, href: "#", label: "GitHub" },
];

export default function ContactPage() {
  const pageRef = useRef<HTMLDivElement>(null);
  const heroRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    subject: "",
    message: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // GSAP animations
  useGSAP(
    () => {
      if (!pageRef.current) return;

      try {
        const ctx = gsap.context(() => {
          // Hero section animation
          if (heroRef.current) {
            const heroElements = heroRef.current.querySelectorAll("[data-hero]");
            gsap.fromTo(
              heroElements,
              { opacity: 0, y: 60, filter: "blur(10px)" },
              {
                opacity: 1,
                y: 0,
                filter: "blur(0px)",
                duration: 1.2,
                stagger: 0.15,
                ease: "power3.out",
              }
            );
          }

          // Form section animation
          const formElements = formRef.current?.querySelectorAll("[data-form]");
          if (formElements) {
            ScrollTrigger.batch(formElements, {
              start: "top 85%",
              onEnter: (batch) =>
                gsap.to(batch, {
                  opacity: 1,
                  y: 0,
                  duration: 0.8,
                  stagger: 0.1,
                  ease: "power2.out",
                }),
              once: true,
            });
          }

          // Contact info cards animation
          if (pageRef.current) {
            const infoCards = pageRef.current.querySelectorAll("[data-info-card]");
            ScrollTrigger.batch(infoCards, {
              start: "top 85%",
              onEnter: (batch) =>
                gsap.to(batch, {
                  opacity: 1,
                  scale: 1,
                  duration: 0.6,
                  stagger: 0.1,
                  ease: "back.out(1.2)",
                }),
              once: true,
            });
          }
        }, pageRef);

        return () => ctx.revert();
      } catch (error) {
        console.error("GSAP animation error:", error);
      }
    },
    { scope: pageRef }
  );

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    // Simulate form submission
    await new Promise((resolve) => setTimeout(resolve, 1500));

    // Reset form
    setFormData({
      name: "",
      email: "",
      phone: "",
      subject: "",
      message: "",
    });

    setIsSubmitting(false);
    alert("Thank you for your message! We'll get back to you soon.");
  };

  return (
    <div
      ref={pageRef}
      className="min-h-screen bg-luxury-black text-white selection:bg-luxury-gold/20 selection:text-white"
    >
      <Navbar />

      {/* Hero Section */}
      <section
        ref={heroRef}
        className="relative overflow-hidden pt-32 pb-20 md:pt-40 md:pb-32"
      >
        {/* Background Effects */}
        <div className="absolute inset-0 bg-gradient-to-b from-luxury-black via-luxury-black/95 to-luxury-black" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(212,175,55,0.05)_0%,transparent_70%)]" />

        <div className="relative z-10 mx-auto max-w-[1400px] px-6 md:px-8 lg:px-12">
          <motion.div
            data-hero
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center max-w-4xl mx-auto"
          >
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-light tracking-tight mb-6">
              <span className="text-white">Get in</span>{" "}
              <span className="bg-gradient-to-r from-luxury-gold via-luxury-lightGold to-luxury-gold bg-clip-text text-transparent">
                touch
              </span>
            </h1>
            <p
              data-hero
              className="text-lg md:text-xl text-luxury-silver/70 max-w-2xl mx-auto leading-relaxed"
            >
              Have questions about our precious metals? Want to discuss a custom order?
              We're here to help. Reach out and let's start a conversation.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Main Content */}
      <section className="relative py-16 md:py-24">
        <div className="absolute inset-0 bg-gradient-to-b from-luxury-black via-luxury-black/98 to-luxury-black" />

        <div className="relative z-10 mx-auto max-w-[1400px] px-6 md:px-8 lg:px-12">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16">
            {/* Contact Form */}
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
              className="space-y-8"
            >
              <div>
                <h2 className="text-3xl md:text-4xl font-light mb-4 text-white">
                  Send us a{" "}
                  <span className="bg-gradient-to-r from-luxury-gold via-luxury-lightGold to-luxury-gold bg-clip-text text-transparent">
                    message
                  </span>
                </h2>
                <p className="text-luxury-silver/60">
                  Fill out the form below and we'll respond as soon as possible.
                </p>
              </div>

              <form ref={formRef} onSubmit={handleSubmit} className="space-y-6">
                <div data-form className="opacity-0">
                  <label
                    htmlFor="name"
                    className="block text-sm font-medium text-luxury-silver/80 mb-2"
                  >
                    Name
                  </label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    required
                    className="w-full px-4 py-3 bg-black/40 border border-white/10 rounded-lg text-white placeholder-white/30 focus:outline-none focus:border-luxury-gold/50 focus:ring-2 focus:ring-luxury-gold/20 transition-all duration-300"
                    placeholder="Your full name"
                  />
                </div>

                <div data-form className="opacity-0">
                  <label
                    htmlFor="email"
                    className="block text-sm font-medium text-luxury-silver/80 mb-2"
                  >
                    Email
                  </label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    required
                    className="w-full px-4 py-3 bg-black/40 border border-white/10 rounded-lg text-white placeholder-white/30 focus:outline-none focus:border-luxury-gold/50 focus:ring-2 focus:ring-luxury-gold/20 transition-all duration-300"
                    placeholder="your.email@example.com"
                  />
                </div>

                <div data-form className="opacity-0">
                  <label
                    htmlFor="phone"
                    className="block text-sm font-medium text-luxury-silver/80 mb-2"
                  >
                    Phone (Optional)
                  </label>
                  <input
                    type="tel"
                    id="phone"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 bg-black/40 border border-white/10 rounded-lg text-white placeholder-white/30 focus:outline-none focus:border-luxury-gold/50 focus:ring-2 focus:ring-luxury-gold/20 transition-all duration-300"
                    placeholder="+62 XXX XXX XXXX"
                  />
                </div>

                <div data-form className="opacity-0">
                  <label
                    htmlFor="subject"
                    className="block text-sm font-medium text-luxury-silver/80 mb-2"
                  >
                    Subject
                  </label>
                  <input
                    type="text"
                    id="subject"
                    name="subject"
                    value={formData.subject}
                    onChange={handleInputChange}
                    required
                    className="w-full px-4 py-3 bg-black/40 border border-white/10 rounded-lg text-white placeholder-white/30 focus:outline-none focus:border-luxury-gold/50 focus:ring-2 focus:ring-luxury-gold/20 transition-all duration-300"
                    placeholder="What's this about?"
                  />
                </div>

                <div data-form className="opacity-0">
                  <label
                    htmlFor="message"
                    className="block text-sm font-medium text-luxury-silver/80 mb-2"
                  >
                    Message
                  </label>
                  <textarea
                    id="message"
                    name="message"
                    value={formData.message}
                    onChange={handleInputChange}
                    required
                    rows={6}
                    className="w-full px-4 py-3 bg-black/40 border border-white/10 rounded-lg text-white placeholder-white/30 focus:outline-none focus:border-luxury-gold/50 focus:ring-2 focus:ring-luxury-gold/20 transition-all duration-300 resize-none"
                    placeholder="Tell us more about your inquiry..."
                  />
                </div>

                <motion.button
                  data-form
                  type="submit"
                  disabled={isSubmitting}
                  className="opacity-0 w-full group relative overflow-hidden inline-flex items-center justify-center gap-3 rounded-lg bg-gradient-to-r from-luxury-gold via-luxury-lightGold to-luxury-gold px-8 py-4 font-semibold text-luxury-black shadow-[0_8px_32px_rgba(212,175,55,0.25)] transition-all duration-500 hover:shadow-[0_12px_48px_rgba(212,175,55,0.4)] hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <span className="relative z-10">
                    {isSubmitting ? "Sending..." : "Send Message"}
                  </span>
                  <Send className="relative z-10 h-5 w-5 transition-transform duration-300 group-hover:translate-x-1" />
                  <div className="absolute inset-0 bg-gradient-to-r from-luxury-lightGold via-luxury-gold to-luxury-lightGold opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                </motion.button>
              </form>
            </motion.div>

            {/* Contact Information & Social */}
            <div className="space-y-12">
              {/* Contact Info Cards */}
              <div className="space-y-6">
                <h3 className="text-2xl md:text-3xl font-light text-white mb-8">
                  Contact{" "}
                  <span className="bg-gradient-to-r from-luxury-silver via-luxury-lightSilver to-luxury-silver bg-clip-text text-transparent">
                    Information
                  </span>
                </h3>

                {contactInfo.map((info, index) => {
                  const Icon = info.icon;
                  return (
                    <motion.a
                      key={info.label}
                      href={info.href}
                      data-info-card
                      initial={{ opacity: 0, scale: 0.9 }}
                      whileInView={{ opacity: 1, scale: 1 }}
                      viewport={{ once: true }}
                      transition={{ delay: index * 0.1, duration: 0.6 }}
                      className="group block relative overflow-hidden rounded-xl border border-white/10 bg-black/40 backdrop-blur-xl p-6 hover:border-luxury-gold/30 hover:bg-black/60 transition-all duration-500"
                    >
                      <div className="flex items-start gap-4">
                        <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-gradient-to-br from-luxury-gold/20 to-luxury-gold/5 border border-luxury-gold/20 flex items-center justify-center group-hover:border-luxury-gold/40 transition-colors">
                          <Icon className="h-6 w-6 text-luxury-gold" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs uppercase tracking-[0.2em] text-luxury-silver/60 mb-1">
                            {info.label}
                          </p>
                          <p className="text-white font-medium group-hover:text-luxury-gold transition-colors">
                            {info.value}
                          </p>
                        </div>
                        <ArrowRight className="h-5 w-5 text-luxury-silver/40 group-hover:text-luxury-gold group-hover:translate-x-1 transition-all" />
                      </div>
                    </motion.a>
                  );
                })}
              </div>

              {/* Social Links */}
              <div>
                <h3 className="text-2xl md:text-3xl font-light text-white mb-8">
                  Follow{" "}
                  <span className="bg-gradient-to-r from-luxury-silver via-luxury-lightSilver to-luxury-silver bg-clip-text text-transparent">
                    Us
                  </span>
                </h3>
                <div className="flex flex-wrap gap-4">
                  {socialLinks.map((social, index) => {
                    const Icon = social.icon;
                    return (
                      <motion.a
                        key={social.label}
                        href={social.href}
                        data-info-card
                        initial={{ opacity: 0, scale: 0.9 }}
                        whileInView={{ opacity: 1, scale: 1 }}
                        viewport={{ once: true }}
                        transition={{ delay: index * 0.05, duration: 0.5 }}
                        className="group relative w-14 h-14 rounded-xl border border-white/10 bg-black/40 backdrop-blur-xl flex items-center justify-center hover:border-luxury-gold/30 hover:bg-black/60 transition-all duration-500"
                        aria-label={social.label}
                      >
                        <Icon className="h-6 w-6 text-luxury-silver/60 group-hover:text-luxury-gold transition-colors" />
                        <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-luxury-gold/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                      </motion.a>
                    );
                  })}
                </div>
              </div>

              {/* Additional Info Card */}
              <motion.div
                data-info-card
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                className="relative overflow-hidden rounded-xl border border-white/10 bg-gradient-to-br from-luxury-gold/5 via-luxury-gold/2 to-transparent p-8"
              >
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(212,175,55,0.1)_0%,transparent_70%)]" />
                <div className="relative z-10">
                  <h4 className="text-xl font-semibold text-white mb-3">
                    Business Hours
                  </h4>
                  <p className="text-luxury-silver/70 mb-2">Monday - Friday</p>
                  <p className="text-white font-medium">9:00 AM - 6:00 PM WIB</p>
                  <p className="text-luxury-silver/70 mt-4 mb-2">Saturday</p>
                  <p className="text-white font-medium">10:00 AM - 2:00 PM WIB</p>
                </div>
              </motion.div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer Section */}
      <footer className="relative border-t border-white/10 py-12">
        <div className="absolute inset-0 bg-gradient-to-t from-luxury-black via-luxury-black/50 to-transparent" />
        <div className="relative z-10 mx-auto max-w-[1400px] px-6 md:px-8 lg:px-12">
          <div className="text-center">
            <p className="text-luxury-silver/50 text-sm">
              © {new Date().getFullYear()} Silver King by CAI. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

