"use client";

import { MouseEvent, useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight, X, QrCode } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigationTransition } from "./NavigationTransitionProvider";
import { getR2UrlClient } from "@/utils/r2-url";
import { useTranslations, useLocale } from "next-intl";
import { usePathname, useRouter } from "@/i18n/routing";
import { routing } from "@/i18n/routing";
import LanguageSwitcher from "./LanguageSwitcher";

export default function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);
  const { beginTransition } = useNavigationTransition();
  const t = useTranslations('nav');
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      const scrollThreshold = 10; // Lower threshold for mobile responsiveness
      const scrollDelta = 5; // Minimum scroll delta to trigger hide/show
      
      // Update isScrolled for background styling
      setIsScrolled(currentScrollY > scrollThreshold);
      
      // Always show navbar at top of page (below threshold)
      if (currentScrollY < scrollThreshold) {
        setIsVisible(true);
        setLastScrollY(currentScrollY);
        return;
      }
      
      // Calculate scroll direction with delta threshold
      const scrollDifference = currentScrollY - lastScrollY;
      
      // Hide navbar when scrolling down (with delta threshold to prevent jitter)
      if (scrollDifference > scrollDelta) {
        setIsVisible(false);
      }
      // Show navbar when scrolling up (with delta threshold)
      else if (scrollDifference < -scrollDelta) {
        setIsVisible(true);
      }
      // If scroll difference is small, maintain current state
      
      setLastScrollY(currentScrollY);
    };

    // Throttle scroll events for better performance (optimized for mobile)
    let ticking = false;
    const throttledHandleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          handleScroll();
          ticking = false;
        });
        ticking = true;
      }
    };

    // Initial check
    handleScroll();

    window.addEventListener("scroll", throttledHandleScroll, { passive: true });
    return () => window.removeEventListener("scroll", throttledHandleScroll);
  }, [lastScrollY]);

  // Check if modal is open by checking body class
  useEffect(() => {
    const checkModalState = () => {
      setIsModalOpen(document.body.classList.contains("modal-active"));
    };

    // Initial check
    checkModalState();

    // Watch for class changes
    const observer = new MutationObserver(checkModalState);
    observer.observe(document.body, {
      attributes: true,
      attributeFilter: ["class"],
    });

    return () => observer.disconnect();
  }, []);

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isMobileMenuOpen]);

  // Build nav links with proper locale handling
  const getLocalizedPath = (path: string) => {
    if (locale === routing.defaultLocale) {
      // Default locale: no prefix
      return path;
    } else {
      // Non-default locale: add prefix
      return `/${locale}${path}`;
    }
  };

  const navLinks = [
    { name: t('whatWeDo'), href: getLocalizedPath('/what-we-do') },
    { name: t('authenticity'), href: getLocalizedPath('/authenticity') },
    { name: t('products'), href: getLocalizedPath('/products') },
    { name: t('aboutUs'), href: getLocalizedPath('/about') },
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
    <motion.header
      initial={false}
      animate={{
        opacity: isModalOpen ? 0 : (isVisible ? 1 : 0),
        y: isModalOpen ? -100 : (isVisible ? 0 : -100),
      }}
      transition={{ 
        duration: 0.35, 
        ease: [0.25, 0.1, 0.25, 1], // Smooth cubic-bezier easing for mobile
        opacity: { duration: 0.3, ease: "easeOut" },
        y: { duration: 0.35, ease: [0.25, 0.1, 0.25, 1] },
      }}
      className={`fixed top-0 left-0 right-0 z-[100] will-change-transform ${
        isScrolled
          ? "bg-black/90 backdrop-blur-2xl border-b border-white/[0.08] shadow-[0_4px_24px_rgba(0,0,0,0.4)]"
          : "bg-transparent"
      } ${isModalOpen ? "pointer-events-none" : ""} ${
        !isVisible && !isModalOpen ? "pointer-events-none" : ""
      }`}
    >
      <nav className="mx-auto max-w-[1440px] px-4 sm:px-6 md:px-10 lg:px-16 xl:px-20">
        <div className="flex items-center justify-between h-[4.5rem] sm:h-[5rem] md:h-[5.5rem]">
          {/* Logo - Smaller for mobile */}
          <Link href={locale === routing.defaultLocale ? '/' : `/${locale}`} className="group relative flex items-center">
            <div className="relative w-10 h-10 sm:w-12 sm:h-12 md:w-14 md:h-14 transition-all duration-500 ease-out group-hover:scale-110 group-hover:rotate-[8deg]">
              <Image
                src={getR2UrlClient("/images/cai-logo.png")}
                alt="Silver King by CAI"
                fill
                className="object-contain brightness-0 invert transition-all duration-500"
                style={{
                  filter:
                    "brightness(0) invert(1) contrast(1.1) drop-shadow(0 0 12px rgba(255, 255, 255, 0.2))",
                }}
                priority
              />
              {/* Powerful glow on hover */}
              <div className="absolute inset-0 scale-150 rounded-full bg-gradient-to-r from-luxury-gold via-luxury-lightGold to-luxury-gold opacity-0 blur-2xl transition-all duration-500 group-hover:opacity-30" />
            </div>
          </Link>

          {/* Desktop Navigation - Bold */}
          <div
            className="hidden lg:flex items-center gap-12 xl:gap-14 translate-x-6 group"
            role="menubar"
          >
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

          {/* CTA Button & Language Switcher */}
          <div className="hidden md:flex items-center gap-4">
            <LanguageSwitcher />
            <Link
              href={getLocalizedPath('/contact')}
              onClick={(event) => handleNavClick(event, getLocalizedPath('/contact'))}
              className="group relative overflow-hidden inline-flex items-center gap-2.5 rounded-full bg-gradient-to-r from-white/[0.12] to-white/[0.08] backdrop-blur-xl border border-white/[0.15] px-6 py-3 font-sans text-[0.9375rem] font-semibold text-white shadow-[0_8px_32px_rgba(0,0,0,0.12)] transition-all duration-500 hover:shadow-[0_8px_32px_rgba(212,175,55,0.25)] hover:scale-105 hover:border-luxury-gold/30"
            >
              <span className="relative z-10 transition-colors duration-300 group-hover:text-luxury-gold">
                {t('getInTouch')}
              </span>
              <ArrowRight className="relative z-10 h-4 w-4 transition-all duration-300 group-hover:translate-x-1 group-hover:text-luxury-gold" />
              {/* Gradient overlay on hover */}
              <div className="absolute inset-0 bg-gradient-to-r from-luxury-gold/10 via-luxury-lightGold/10 to-luxury-gold/10 opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
            </Link>
          </div>

          {/* Mobile Menu Button - Smaller - Hidden when menu is open */}
          {!isMobileMenuOpen && (
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="md:hidden flex flex-col gap-1.5 p-2 relative z-[101]"
              aria-label="Toggle menu"
            >
              <motion.span
                animate={{ rotate: 0, y: 0 }}
                className="w-6 h-[2px] bg-white rounded-full transition-all"
              />
              <motion.span
                animate={{ opacity: 1 }}
                className="w-6 h-[2px] bg-white rounded-full transition-all"
              />
              <motion.span
                animate={{ rotate: 0, y: 0 }}
                className="w-6 h-[2px] bg-white rounded-full transition-all"
              />
            </button>
          )}
        </div>

        {/* Mobile Menu - Pixelmatters Style Full Screen */}
        <AnimatePresence>
          {isMobileMenuOpen && (
            <>
              {/* Backdrop */}
              <motion.div
                initial={{ opacity: 1 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="fixed inset-0 bg-black z-[99] md:hidden"
                onClick={() => setIsMobileMenuOpen(false)}
              />

              {/* Menu Content */}
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                className="fixed inset-0  z-[100] md:hidden"
              >
                <div className="min-h-screen flex flex-col px-6 sm:px-8 py-8 sm:py-10 bg-black">
                  {/* Header - Logo & Close Button */}
                  <div className="flex items-center justify-between mb-12 sm:mb-16">
                    <Link
                      href={locale === routing.defaultLocale ? '/' : `/${locale}`}
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="flex items-center"
                    >
                      <div className="relative w-10 h-10 sm:w-12 sm:h-12">
                        <Image
                          src={getR2UrlClient("/images/cai-logo.png")}
                          alt="Silver King by CAI"
                          fill
                          className="object-contain brightness-0 invert"
                          style={{
                            filter: "brightness(0) invert(1)",
                          }}
                          priority
                        />
                      </div>
                      <span className="ml-3 font-sans text-lg sm:text-xl font-medium text-white">
                        Silver King
                      </span>
                    </Link>
                    <button
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="flex items-center justify-center w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 transition-colors"
                      aria-label="Close menu"
                    >
                      <X className="h-5 w-5 text-white" />
                    </button>
                  </div>

                  {/* Navigation Links */}
                  <nav className="flex-1 space-y-1 mb-8 sm:mb-12">
                    {navLinks.map((link, index) => (
                      <motion.div
                        key={link.name}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.08, duration: 0.4 }}
                      >
                        <Link
                          href={link.href}
                          onClick={(event) => {
                            handleNavClick(event, link.href);
                            setIsMobileMenuOpen(false);
                          }}
                          className="block font-sans text-2xl sm:text-3xl font-medium text-white py-4 transition-all duration-300 hover:text-white/80"
                        >
                          {link.name}
                        </Link>
                      </motion.div>
                    ))}
                  </nav>

                  {/* Language Switcher in Mobile Menu */}
                  <div className="mb-6">
                    <LanguageSwitcher />
                  </div>

                  {/* Featured Card - Scan & Verify (Like Pixelmatters Case Study - Compact) */}
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4, duration: 0.5 }}
                    className="mb-6 sm:mb-8"
                  >
                    <Link
                      href={getLocalizedPath('/authenticity')}
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="group block relative overflow-hidden rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 transition-all duration-300 hover:border-white/20"
                    >
                      <div className="flex items-center gap-3 sm:gap-4 p-3 sm:p-4">
                        {/* Icon/Thumbnail - Smaller */}
                        <div className="flex-shrink-0 w-12 h-12 sm:w-14 sm:h-14 rounded-lg border border-white/20 bg-black/40 flex items-center justify-center group-hover:bg-white/10 transition-colors">
                          <QrCode className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                        </div>

                        {/* Content - Compact */}
                        <div className="flex-1 min-w-0">
                          <p className="font-sans text-[0.6rem] sm:text-[0.65rem] uppercase tracking-[0.25em] sm:tracking-[0.3em] text-white/50 mb-1">
                            SCAN & VERIFY
                          </p>
                          <h3 className="font-sans text-sm sm:text-base font-semibold text-white leading-tight group-hover:text-white/90 transition-colors">
                            Tap to launch Silver King QR scanner
                          </h3>
                          <p className="font-sans text-xs sm:text-sm text-white/60 leading-relaxed mt-1 line-clamp-2">
                            Capture the QR seal to view purity & provenance.
                          </p>
                        </div>
                      </div>
                    </Link>
                  </motion.div>

                  {/* CTA Button */}
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5, duration: 0.4 }}
                    className="mb-8"
                  >
                    <Link
                      href={getLocalizedPath('/contact')}
                      onClick={(event) => {
                        handleNavClick(event, getLocalizedPath('/contact'));
                        setIsMobileMenuOpen(false);
                      }}
                      className="group flex items-center justify-center gap-2 rounded-full bg-white/10 hover:bg-white/15 border border-white/20 px-6 py-4 font-sans text-base font-semibold text-white transition-all duration-300 hover:scale-[1.02]"
                    >
                      <span>Get in touch</span>
                      <ArrowRight className="h-5 w-5 transition-transform duration-300 group-hover:translate-x-1" />
                    </Link>
                  </motion.div>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </nav>
    </motion.header>
  );
}
