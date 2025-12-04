"use client";

import { MouseEvent, useEffect, useState, useMemo } from "react";
import { Link } from "@/i18n/routing";
import Image from "next/image";
import { ArrowRight, X, QrCode, ShieldCheck } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { getR2UrlClient } from "@/utils/r2-url";
import { useTranslations, useLocale } from "next-intl";
import { usePathname, useRouter } from "@/i18n/routing";
import { routing } from "@/i18n/routing";
import LanguageSwitcher from "./LanguageSwitcher";

export default function Navbar() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const t = useTranslations("nav");
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    // PRODUCTION-SAFE: Ensure window exists
    if (typeof window === "undefined") return;

    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      const scrollThreshold = 10; // Lower threshold for mobile responsiveness
      const scrollDelta = 5; // Minimum scroll delta to trigger hide/show

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

  // Check if user is admin - ultra-optimized with instant cache + deferred background refresh
  useEffect(() => {
    // IMMEDIATE: Check cache first (synchronous, instant, 0ms delay)
    const cached = sessionStorage.getItem("isAdmin");
    if (cached !== null) {
      setIsAdmin(cached === "true");
    }

    // DEFERRED: Refresh admin status in idle time (non-blocking, low priority)
    const checkAdmin = async () => {
      try {
        const res = await fetch("/api/admin/me", {
          cache: "no-store",
        });
        if (res.ok) {
          const data = await res.json();
          const adminStatus = data?.isAdmin === true;
          
          // Always update state and cache
          setIsAdmin(adminStatus);
          sessionStorage.setItem("isAdmin", String(adminStatus));
        } else {
          setIsAdmin(false);
          sessionStorage.setItem("isAdmin", "false");
        }
      } catch (error) {
        // Silently fail - user is not admin
        setIsAdmin(false);
        sessionStorage.setItem("isAdmin", "false");
      }
    };
    
    // Defer check to idle time using requestIdleCallback or setTimeout fallback
    if (typeof window !== "undefined" && "requestIdleCallback" in window) {
      requestIdleCallback(() => checkAdmin(), { timeout: 2000 });
    } else {
      setTimeout(checkAdmin, 100);
    }
  }, []);

  // Lock body scroll when mobile menu is open - PRODUCTION-SAFE
  useEffect(() => {
    // PRODUCTION-SAFE: Ensure document exists
    if (typeof window === "undefined" || typeof document === "undefined" || !document.body) return;

    if (isMobileMenuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isMobileMenuOpen]);

  // Use paths without locale prefix - Link from next-intl will handle locale automatically
  // Wrap in useMemo to prevent dependency changes on every render
  const navLinks = useMemo(
    () => [
      { name: t("whatWeDo"), href: "/what-we-do" },
      { name: t("authenticity"), href: "/authenticity" },
      { name: t("products"), href: "/products" },
      { name: t("aboutUs"), href: "/about" },
    ],
    [t]
  );

  // OPTIMIZED: ULTRA-AGGRESSIVE prefetch for ALL navigation links
  // Uses multiple strategies including Next.js native router for locale routes
  // Enhanced with immediate prefetching and hover prefetching
  useEffect(() => {
    const prefetchNavLinks = () => {
      // Include contact page in prefetch list
      const allLinks = [...navLinks, { name: "contact", href: "/contact" }];

      allLinks.forEach((link) => {
        // Strategy 1: Use next-intl router.prefetch (handles locale automatically)
        try {
          router.prefetch(link.href);
        } catch (error) {
          // Silently fail
        }

        // Strategy 2: Direct link prefetch with explicit locale path
        // This ensures the browser caches the exact URL with locale prefix
        if (typeof window !== "undefined") {
          try {
            const fullPath =
              locale === routing.defaultLocale
                ? link.href
                : `/${locale}${link.href === "/" ? "" : link.href}`;

            // Prefetch document
            const prefetchLink = document.createElement("link");
            prefetchLink.rel = "prefetch";
            prefetchLink.as = "document";
            prefetchLink.href = fullPath;
            if (!document.querySelector(`link[rel="prefetch"][href="${fullPath}"]`)) {
              document.head.appendChild(prefetchLink);
            }

            // Prefetch RSC payload (React Server Components)
            const rscLink = document.createElement("link");
            rscLink.rel = "prefetch";
            rscLink.as = "fetch";
            rscLink.href = `${fullPath}?_rsc=`;
            rscLink.crossOrigin = "anonymous";
            if (!document.querySelector(`link[rel="prefetch"][href="${fullPath}?_rsc="]`)) {
              document.head.appendChild(rscLink);
            }
          } catch (error) {
            // Silently fail
          }
        }
      });
    };

    // Prefetch immediately on mount
    prefetchNavLinks();

    // Also prefetch again after a short delay to ensure it's cached
    const timeoutId = setTimeout(() => {
      prefetchNavLinks();
    }, 300);

    // Prefetch one more time after page is fully loaded
    const handleLoad = () => {
      prefetchNavLinks();
    };

    if (typeof window !== "undefined") {
      if (document.readyState === "complete") {
        handleLoad();
      } else {
        window.addEventListener("load", handleLoad, { once: true });
      }
    }

    return () => {
      clearTimeout(timeoutId);
      if (typeof window !== "undefined") {
        window.removeEventListener("load", handleLoad);
      }
    };
  }, [locale, router, navLinks]); // Re-prefetch when locale changes

  const handleNavClick = (event: MouseEvent<HTMLAnchorElement>, href: string) => {
    // Allow default navigation for special keys (open in new tab, etc.)
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) {
      return;
    }
    const isHashLink = href.startsWith("#") || href.includes("#");
    if (isHashLink) {
      return;
    }

    // No transition - direct navigation
  };

  return (
    <motion.header
      initial={false}
      animate={{
        opacity: isModalOpen ? 0 : isVisible ? 1 : 0,
        y: isModalOpen ? -100 : isVisible ? 0 : -100,
      }}
      transition={{
        duration: 0.35,
        ease: [0.25, 0.1, 0.25, 1], // Smooth cubic-bezier easing for mobile
        opacity: { duration: 0.3, ease: "easeOut" },
        y: { duration: 0.35, ease: [0.25, 0.1, 0.25, 1] },
      }}
      className={`fixed top-0 left-0 right-0 z-[100] will-change-transform bg-transparent ${isModalOpen ? "pointer-events-none" : "pointer-events-auto"}`}
    >
      <nav className="mx-auto max-w-[1440px] px-4 sm:px-6 md:px-10 lg:px-16 xl:px-20">
        <div className="flex items-center justify-between h-[4.5rem] sm:h-[5rem] md:h-[5.5rem]">
          {/* Logo - Smaller for mobile */}
          <Link
            href="/"
            prefetch={true}
            className="group relative flex items-center"
            onClick={() => {
              // Direct navigation - no transition
            }}
          >
            <div className="relative w-10 h-10 sm:w-12 sm:h-12 md:w-14 md:h-14 transition-all duration-500 ease-out group-hover:scale-110 group-hover:rotate-[8deg]">
              <Image
                src={getR2UrlClient("/images/cai-logo.png")}
                alt="Silver King by CAI"
                fill
                sizes="(max-width: 640px) 40px, (max-width: 768px) 48px, 56px"
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
                prefetch={true}
                className="relative font-sans text-[0.9375rem] font-medium text-white/70 transition-all duration-300 hover:text-white focus-visible:text-white group-hover:text-white/40 group-hover:hover:text-white"
                onClick={(event) => handleNavClick(event, link.href)}
                onMouseEnter={() => {
                  // Aggressive hover prefetching for instant navigation
                  try {
                    router.prefetch(link.href);
                    const fullPath =
                      locale === routing.defaultLocale
                        ? link.href
                        : `/${locale}${link.href === "/" ? "" : link.href}`;
                    if (
                      typeof window !== "undefined" &&
                      !document.querySelector(`link[rel="prefetch"][href="${fullPath}"]`)
                    ) {
                      const prefetchLink = document.createElement("link");
                      prefetchLink.rel = "prefetch";
                      prefetchLink.as = "document";
                      prefetchLink.href = fullPath;
                      document.head.appendChild(prefetchLink);
                    }
                  } catch (e) {
                    // Silently fail
                  }
                }}
                role="menuitem"
                style={{ fontFamily: "__GeistSans_fb8f2c, __GeistSans_Fallback_fb8f2c" }}
              >
                <span
                  className="relative z-10"
                  style={{ fontFamily: "__GeistSans_fb8f2c, __GeistSans_Fallback_fb8f2c" }}
                >
                  {link.name}
                </span>
              </Link>
            ))}
          </div>

          {/* CTA Button & Language Switcher */}
          <div className="hidden md:flex items-center gap-4" style={{ contain: "layout style" }}>
            <LanguageSwitcher />
            
            {/* Admin Dashboard Button - Only visible when logged in as admin */}
            {/* Fixed width container to completely prevent layout shift */}
            <div 
              className="relative flex items-center justify-center"
              style={{ 
                width: isAdmin === true ? "auto" : "0px",
                transition: "width 0.4s cubic-bezier(0.22, 1, 0.36, 1)",
                contain: "layout style",
              }}
            >
              <motion.a
                href="/admin"
                initial={false}
                animate={{
                  opacity: isAdmin === true ? 1 : 0,
                  scale: isAdmin === true ? 1 : 0.92,
                }}
                whileHover={{ scale: isAdmin === true ? 1.03 : 1 }}
                transition={{ 
                  duration: 0.4, 
                  ease: [0.22, 1, 0.36, 1],
                  opacity: { duration: 0.3 }
                }}
                className="group relative flex items-center gap-2 rounded-full border border-luxury-gold/30 bg-luxury-gold/10 px-4 py-2.5 backdrop-blur-xl hover:border-luxury-gold/50 hover:bg-luxury-gold/20 hover:shadow-[0_0_20px_rgba(212,175,55,0.3)] will-change-[transform,opacity]"
                style={{ 
                  fontFamily: "__GeistSans_fb8f2c, __GeistSans_Fallback_fb8f2c",
                  pointerEvents: isAdmin === true ? "auto" : "none",
                  transform: "translateZ(0)", // Force GPU acceleration
                  backfaceVisibility: "hidden", // Prevent flicker
                }}
                title="Admin Dashboard"
                tabIndex={isAdmin === true ? 0 : -1}
              >
                <ShieldCheck className="h-4 w-4 text-luxury-gold flex-shrink-0" />
                <span className="text-xs font-semibold text-luxury-gold whitespace-nowrap" style={{ fontFamily: "__GeistSans_fb8f2c, __GeistSans_Fallback_fb8f2c" }}>ADMIN</span>
                <div className="absolute inset-0 rounded-full bg-gradient-to-r from-luxury-gold/20 to-luxury-lightGold/20 opacity-0 blur-xl transition-opacity duration-300 group-hover:opacity-100" />
              </motion.a>
            </div>
            
            <Link
              href="/contact"
              prefetch={true}
              onClick={(event) => handleNavClick(event, "/contact")}
              onMouseEnter={() => {
                // Aggressive hover prefetching
                try {
                  router.prefetch("/contact");
                  const fullPath =
                    locale === routing.defaultLocale ? "/contact" : `/${locale}/contact`;
                  if (
                    typeof window !== "undefined" &&
                    !document.querySelector(`link[rel="prefetch"][href="${fullPath}"]`)
                  ) {
                    const prefetchLink = document.createElement("link");
                    prefetchLink.rel = "prefetch";
                    prefetchLink.as = "document";
                    prefetchLink.href = fullPath;
                    document.head.appendChild(prefetchLink);
                  }
                } catch (e) {
                  // Silently fail
                }
              }}
              className="group relative overflow-hidden inline-flex items-center gap-2.5 rounded-full bg-gradient-to-r from-white/[0.12] to-white/[0.08] backdrop-blur-xl border border-white/[0.15] px-6 py-3 font-sans text-[0.9375rem] font-semibold text-white shadow-[0_8px_32px_rgba(0,0,0,0.12)] transition-all duration-500 hover:shadow-[0_8px_32px_rgba(212,175,55,0.25)] hover:scale-105 hover:border-luxury-gold/30"
              style={{ fontFamily: "__GeistSans_fb8f2c, __GeistSans_Fallback_fb8f2c" }}
            >
              <span
                className="relative z-10 transition-colors duration-300 group-hover:text-luxury-gold"
                style={{ fontFamily: "__GeistSans_fb8f2c, __GeistSans_Fallback_fb8f2c" }}
              >
                {t("getInTouch")}
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
              style={{ fontFamily: "__GeistSans_fb8f2c, __GeistSans_Fallback_fb8f2c" }}
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
                      href="/"
                      prefetch={true}
                      onClick={(e) => {
                        setIsMobileMenuOpen(false);
                        // ALWAYS trigger transition when clicking logo to go home
                        const href = locale === routing.defaultLocale ? "/" : `/${locale}`;
                        if (pathname !== href) {
                          // PRODUCTION-SAFE: Enhanced with DOM readiness check
                          // Call immediately for immediate blur effect
                          if (
                            typeof window !== "undefined" &&
                            typeof document !== "undefined" &&
                            document.body
                          ) {
                            // No transition
                          } else {
                            // Retry after DOM is ready
                            setTimeout(() => {
                              if (
                                typeof window !== "undefined" &&
                                typeof document !== "undefined" &&
                                document.body
                              ) {
                                // No transition
                              }
                            }, 10);
                          }
                        }
                      }}
                      className="flex items-center"
                    >
                      <div className="relative w-10 h-10 sm:w-12 sm:h-12">
                        <Image
                          src={getR2UrlClient("/images/cai-logo.png")}
                          alt="Silver King by CAI"
                          fill
                          sizes="(max-width: 640px) 40px, 48px"
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
                      style={{ fontFamily: "__GeistSans_fb8f2c, __GeistSans_Fallback_fb8f2c" }}
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
                          prefetch={true}
                          onClick={(event) => {
                            handleNavClick(event, link.href);
                            setIsMobileMenuOpen(false);
                          }}
                          onMouseEnter={() => {
                            // Aggressive hover prefetching for mobile menu
                            try {
                              router.prefetch(link.href);
                              const fullPath =
                                locale === routing.defaultLocale
                                  ? link.href
                                  : `/${locale}${link.href === "/" ? "" : link.href}`;
                              if (
                                typeof window !== "undefined" &&
                                !document.querySelector(`link[rel="prefetch"][href="${fullPath}"]`)
                              ) {
                                const prefetchLink = document.createElement("link");
                                prefetchLink.rel = "prefetch";
                                prefetchLink.as = "document";
                                prefetchLink.href = fullPath;
                                document.head.appendChild(prefetchLink);
                              }
                            } catch (e) {
                              // Silently fail
                            }
                          }}
                          className="block font-sans text-2xl sm:text-3xl font-medium text-white py-4 transition-all duration-300 hover:text-white/80"
                          style={{ fontFamily: "__GeistSans_fb8f2c, __GeistSans_Fallback_fb8f2c" }}
                        >
                          {link.name}
                        </Link>
                      </motion.div>
                    ))}
                  </nav>

                  {/* Language Switcher in Mobile Menu - Prominent Position */}
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3, duration: 0.4 }}
                    className="mb-8 sm:mb-10 flex justify-center gap-3"
                  >
                    <LanguageSwitcher />
                    
                    {/* Admin Dashboard Button - Mobile */}
                    <motion.a
                      href="/admin"
                      onClick={() => setIsMobileMenuOpen(false)}
                      initial={false}
                      animate={{
                        opacity: isAdmin === true ? 1 : 0,
                        scale: isAdmin === true ? 1 : 0.92,
                      }}
                      whileTap={{ scale: isAdmin === true ? 0.95 : 1 }}
                      transition={{ 
                        duration: 0.4, 
                        ease: [0.22, 1, 0.36, 1],
                        opacity: { duration: 0.3 }
                      }}
                      className="group relative flex items-center gap-2 rounded-full border border-luxury-gold/30 bg-luxury-gold/10 px-4 py-2.5 backdrop-blur-xl hover:border-luxury-gold/50 hover:bg-luxury-gold/20 will-change-[transform,opacity]"
                      style={{ 
                        fontFamily: "__GeistSans_fb8f2c, __GeistSans_Fallback_fb8f2c",
                        pointerEvents: isAdmin === true ? "auto" : "none",
                        transform: "translateZ(0)",
                        backfaceVisibility: "hidden",
                      }}
                      tabIndex={isAdmin === true ? 0 : -1}
                    >
                      <ShieldCheck className="h-4 w-4 text-luxury-gold" />
                      <span className="text-xs font-semibold text-luxury-gold" style={{ fontFamily: "__GeistSans_fb8f2c, __GeistSans_Fallback_fb8f2c" }}>ADMIN</span>
                    </motion.a>
                  </motion.div>

                  {/* Featured Card - Scan & Verify (Like Pixelmatters Case Study - Compact) */}
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4, duration: 0.5 }}
                    className="mb-6 sm:mb-8"
                  >
                    <Link
                      href="/authenticity"
                      prefetch={true}
                      onClick={(event) => {
                        handleNavClick(event, "/authenticity");
                        setIsMobileMenuOpen(false);
                      }}
                      className="group block relative overflow-hidden rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 transition-all duration-300 hover:border-white/20"
                      style={{ fontFamily: "__GeistSans_fb8f2c, __GeistSans_Fallback_fb8f2c" }}
                    >
                      <div className="flex items-center gap-3 sm:gap-4 p-3 sm:p-4">
                        {/* Icon/Thumbnail - Smaller */}
                        <div className="flex-shrink-0 w-12 h-12 sm:w-14 sm:h-14 rounded-lg border border-white/20 bg-black/40 flex items-center justify-center group-hover:bg-white/10 transition-colors">
                          <QrCode className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                        </div>

                        {/* Content - Compact */}
                        <div className="flex-1 min-w-0">
                          <p
                            className="font-sans text-[0.6rem] sm:text-[0.65rem] uppercase tracking-[0.25em] sm:tracking-[0.3em] text-white/50 mb-1"
                            style={{
                              fontFamily: "__GeistSans_fb8f2c, __GeistSans_Fallback_fb8f2c",
                            }}
                          >
                            SCAN & VERIFY
                          </p>
                          <h3
                            className="font-sans text-sm sm:text-base font-semibold text-white leading-tight group-hover:text-white/90 transition-colors"
                            style={{
                              fontFamily: "__GeistSans_fb8f2c, __GeistSans_Fallback_fb8f2c",
                            }}
                          >
                            Tap to launch Silver King QR scanner
                          </h3>
                          <p
                            className="font-sans text-xs sm:text-sm text-white/60 leading-relaxed mt-1 line-clamp-2"
                            style={{
                              fontFamily: "__GeistSans_fb8f2c, __GeistSans_Fallback_fb8f2c",
                            }}
                          >
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
                      href="/contact"
                      prefetch={true}
                      onClick={(event) => {
                        handleNavClick(event, "/contact");
                        setIsMobileMenuOpen(false);
                      }}
                      className="group flex items-center justify-center gap-2 rounded-full bg-white/10 hover:bg-white/15 border border-white/20 px-6 py-4 font-sans text-base font-semibold text-white transition-all duration-300 hover:scale-[1.02]"
                      style={{ fontFamily: "__GeistSans_fb8f2c, __GeistSans_Fallback_fb8f2c" }}
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
