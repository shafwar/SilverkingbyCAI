"use client";

import { MouseEvent, useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigationTransition } from "./NavigationTransitionProvider";

export default function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { beginTransition } = useNavigationTransition();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const navLinks = [
    { name: "What we do", href: "/what-we-do" },
    { name: "Authenticity", href: "/authenticity" },
    { name: "Products", href: "/products" },
    { name: "About us", href: "/about" },
  ];

  const handleNavClick = (event: MouseEvent<HTMLAnchorElement>, href: string) => {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) {
      return;
    }
    const isHashLink = href.startsWith("#") || href.includes("#");
    if (isHashLink) {
      return;
    }
    beginTransition(href);
  };

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-[100] transition-all duration-500 ${
        isScrolled
          ? "bg-black/90 backdrop-blur-2xl border-b border-white/[0.08] shadow-[0_4px_24px_rgba(0,0,0,0.4)]"
          : "bg-transparent"
      }`}
    >
      <nav className="mx-auto max-w-[1440px] px-6 md:px-10 lg:px-16 xl:px-20">
        <div className="flex items-center justify-between h-[5.5rem]">
          {/* Logo - Bold & Powerful */}
          <Link href="/" className="group relative flex items-center">
            <div className="relative w-14 h-14 transition-all duration-500 ease-out group-hover:scale-110 group-hover:rotate-[8deg]">
              <Image
                src="/images/cai-logo.png"
                alt="Silver King by CAI"
                fill
                className="object-contain brightness-0 invert transition-all duration-500"
                style={{
                  filter: "brightness(0) invert(1) contrast(1.1) drop-shadow(0 0 12px rgba(255, 255, 255, 0.2))",
                }}
                priority
              />
              {/* Powerful glow on hover */}
              <div className="absolute inset-0 scale-150 rounded-full bg-gradient-to-r from-luxury-gold via-luxury-lightGold to-luxury-gold opacity-0 blur-2xl transition-all duration-500 group-hover:opacity-30" />
            </div>
          </Link>

          {/* Desktop Navigation - Bold */}
          <div className="hidden lg:flex items-center gap-12 xl:gap-14 translate-x-6 group" role="menubar">
            {navLinks.map((link) => (
              <Link
                key={link.name}
                href={link.href}
                className="relative font-sans text-[0.9375rem] font-medium text-white/70 transition-all duration-300 hover:text-white focus-visible:text-white group-hover:text-white/40 group-hover:hover:text-white"
                onClick={(event) => handleNavClick(event, link.href)}
                role="menuitem"
              >
                <span className="relative z-10">{link.name}</span>
              </Link>
            ))}
          </div>

          {/* CTA Button - Powerful & Bold */}
          <div className="hidden md:flex items-center">
            <Link
              href="/admin/login"
              className="group relative overflow-hidden inline-flex items-center gap-2.5 rounded-full bg-gradient-to-r from-white/[0.12] to-white/[0.08] backdrop-blur-xl border border-white/[0.15] px-6 py-3 font-sans text-[0.9375rem] font-semibold text-white shadow-[0_8px_32px_rgba(0,0,0,0.12)] transition-all duration-500 hover:shadow-[0_8px_32px_rgba(212,175,55,0.25)] hover:scale-105 hover:border-luxury-gold/30"
            >
              <span className="relative z-10 transition-colors duration-300 group-hover:text-luxury-gold">
                Get in touch
              </span>
              <ArrowRight className="relative z-10 h-4 w-4 transition-all duration-300 group-hover:translate-x-1 group-hover:text-luxury-gold" />
              {/* Gradient overlay on hover */}
              <div className="absolute inset-0 bg-gradient-to-r from-luxury-gold/10 via-luxury-lightGold/10 to-luxury-gold/10 opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
            </Link>
          </div>

          {/* Mobile Menu Button - Bold */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="md:hidden flex flex-col gap-2 p-3 relative z-50"
            aria-label="Toggle menu"
          >
            <motion.span
              animate={isMobileMenuOpen ? { rotate: 45, y: 8 } : { rotate: 0, y: 0 }}
              className="w-7 h-[2.5px] bg-white rounded-full transition-all"
            />
            <motion.span
              animate={isMobileMenuOpen ? { opacity: 0 } : { opacity: 1 }}
              className="w-7 h-[2.5px] bg-white rounded-full transition-all"
            />
            <motion.span
              animate={isMobileMenuOpen ? { rotate: -45, y: -8 } : { rotate: 0, y: 0 }}
              className="w-7 h-[2.5px] bg-white rounded-full transition-all"
            />
          </button>
        </div>

        {/* Mobile Menu - Powerful Entrance */}
        <AnimatePresence>
          {isMobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0, y: -20 }}
              animate={{ opacity: 1, height: "auto", y: 0 }}
              exit={{ opacity: 0, height: 0, y: -20 }}
              transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
              className="md:hidden overflow-hidden border-t border-white/10 bg-black/95 backdrop-blur-2xl"
            >
              <div className="py-8 space-y-2">
                {navLinks.map((link, index) => (
                  <motion.div
                    key={link.name}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1, duration: 0.4 }}
                  >
                    <Link
                      href={link.href}
                      onClick={(event) => {
                        handleNavClick(event, link.href);
                        setIsMobileMenuOpen(false);
                      }}
                      className="block font-sans text-lg font-semibold text-white/80 transition-all duration-300 hover:text-white hover:translate-x-2 py-3 px-2"
                    >
                      {link.name}
                    </Link>
                  </motion.div>
                ))}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4, duration: 0.4 }}
                  className="pt-4"
                >
                  <Link
                    href="/admin/login"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-luxury-gold to-luxury-lightGold px-6 py-3.5 font-sans text-base font-bold text-black shadow-lg transition-all duration-300 hover:shadow-[0_8px_30px_rgba(212,175,55,0.4)] hover:scale-105"
                  >
                    <span>Get in touch</span>
                    <ArrowRight className="h-5 w-5" />
                  </Link>
                </motion.div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>
    </header>
  );
}
