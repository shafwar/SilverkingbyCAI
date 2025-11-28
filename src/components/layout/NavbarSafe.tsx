"use client";

/**
 * SAFE Navbar Component - Fallback version that doesn't require NavigationTransitionProvider
 * 
 * This component can be used in pages that don't have NavigationTransitionProvider.
 * It provides basic navigation without transition animations.
 * 
 * USAGE:
 * - Use this component in pages that cannot have NavigationTransitionProvider
 * - Prefer using regular Navbar in pages with NavigationTransitionProvider for better UX
 */

import { MouseEvent, useEffect, useState } from "react";
import { Link } from "@/i18n/routing";
import Image from "next/image";
import { ArrowRight, X, QrCode } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { getR2UrlClient } from "@/utils/r2-url";
import { useTranslations, useLocale } from "next-intl";
import { usePathname, useRouter } from "@/i18n/routing";
import { routing } from "@/i18n/routing";
import LanguageSwitcher from "./LanguageSwitcher";

export default function NavbarSafe() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);
  // SAFE: No useNavigationTransition - uses router directly
  const t = useTranslations('nav');
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      const scrollThreshold = 10;
      
      if (currentScrollY > scrollThreshold) {
        setIsScrolled(true);
      } else {
        setIsScrolled(false);
      }

      if (currentScrollY < lastScrollY && currentScrollY > scrollThreshold) {
        setIsVisible(true);
      } else if (currentScrollY > lastScrollY && currentScrollY > scrollThreshold) {
        setIsVisible(false);
      }

      setLastScrollY(currentScrollY);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [lastScrollY]);

  useEffect(() => {
    const checkModalState = () => {
      setIsModalOpen(document.body.classList.contains("modal-active"));
    };

    checkModalState();
    const observer = new MutationObserver(checkModalState);
    observer.observe(document.body, {
      attributes: true,
      attributeFilter: ["class"],
    });

    return () => observer.disconnect();
  }, []);

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

  const getLocalizedPath = (path: string) => {
    if (locale === routing.defaultLocale) {
      return path;
    } else {
      return `/${locale}${path}`;
    }
  };

  const navLinks = [
    { name: t('whatWeDo'), href: getLocalizedPath('/what-we-do') },
    { name: t('authenticity'), href: getLocalizedPath('/authenticity') },
    { name: t('products'), href: getLocalizedPath('/products') },
    { name: t('aboutUs'), href: getLocalizedPath('/about') },
  ];

  // SAFE: Direct navigation without transition
  const handleNavClick = (event: MouseEvent<HTMLAnchorElement>, href: string) => {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) {
      return;
    }
    const isHashLink = href.startsWith("#") || href.includes("#");
    if (isHashLink) {
      return;
    }
    // Direct navigation - no transition animation
    // Navigation is handled by Link component from next-intl
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
        ease: [0.25, 0.1, 0.25, 1],
        opacity: { duration: 0.3, ease: "easeOut" },
        y: { duration: 0.35, ease: [0.25, 0.1, 0.25, 1] },
      }}
      className={`fixed top-0 left-0 right-0 z-[100] will-change-transform ${
        isScrolled
          ? "bg-black/90 backdrop-blur-2xl border-b border-white/[0.08] shadow-[0_4px_24px_rgba(0,0,0,0.4)]"
          : "bg-transparent"
      } ${isModalOpen ? "pointer-events-none" : "pointer-events-auto"}`}
    >
      <nav className="mx-auto max-w-[1440px] px-4 sm:px-6 md:px-10 lg:px-16 xl:px-20">
        <div className="flex items-center justify-between h-[4.5rem] sm:h-[5rem] md:h-[5.5rem]">
          <Link href={locale === routing.defaultLocale ? '/' : `/${locale}`} className="group relative flex items-center">
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
              <div className="absolute inset-0 scale-150 rounded-full bg-gradient-to-r from-luxury-gold via-luxury-lightGold to-luxury-gold opacity-0 blur-2xl transition-all duration-500 group-hover:opacity-30" />
            </div>
          </Link>

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
              <div className="absolute inset-0 bg-gradient-to-r from-luxury-gold/10 via-luxury-lightGold/10 to-luxury-gold/10 opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
            </Link>
          </div>

          <button
            type="button"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="md:hidden flex flex-col gap-1.5 p-2 relative z-[101]"
            aria-label="Toggle mobile menu"
            aria-expanded={isMobileMenuOpen}
          >
            <span
              className={`block w-6 h-0.5 bg-white transition-all duration-300 ${
                isMobileMenuOpen ? "rotate-45 translate-y-2" : ""
              }`}
            />
            <span
              className={`block w-6 h-0.5 bg-white transition-all duration-300 ${
                isMobileMenuOpen ? "opacity-0" : ""
              }`}
            />
            <span
              className={`block w-6 h-0.5 bg-white transition-all duration-300 ${
                isMobileMenuOpen ? "-rotate-45 -translate-y-2" : ""
              }`}
            />
          </button>
        </div>
      </nav>

      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              onClick={() => setIsMobileMenuOpen(false)}
              className="fixed inset-0 bg-black z-[99] md:hidden"
            />
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className="fixed inset-0  z-[100] md:hidden"
            >
              <div className="flex flex-col h-full bg-black/95 backdrop-blur-2xl border-l border-white/10">
                <div className="flex items-center justify-between p-6 border-b border-white/10">
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
                        sizes="(max-width: 640px) 40px, 48px"
                        className="object-contain brightness-0 invert"
                        style={{
                          filter: "brightness(0) invert(1)",
                        }}
                        priority
                      />
                    </div>
                  </Link>
                  <button
                    type="button"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="p-2 text-white/70 hover:text-white transition-colors"
                    aria-label="Close mobile menu"
                  >
                    <X className="h-6 w-6" />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto px-6 py-8 space-y-6">
                  {navLinks.map((link) => (
                    <Link
                      key={link.name}
                      href={link.href}
                      onClick={(event) => {
                        handleNavClick(event, link.href);
                        setIsMobileMenuOpen(false);
                      }}
                      className="block font-sans text-2xl sm:text-3xl font-medium text-white py-4 transition-all duration-300 hover:text-white/80"
                    >
                      {link.name}
                    </Link>
                  ))}

                  <div className="pt-6 border-t border-white/10">
                    <LanguageSwitcher />
                  </div>

                  <Link
                    href={getLocalizedPath('/contact')}
                    onClick={(event) => {
                      handleNavClick(event, getLocalizedPath('/contact'));
                      setIsMobileMenuOpen(false);
                    }}
                    className="group flex items-center justify-center gap-2 rounded-full bg-white/10 hover:bg-white/15 border border-white/20 px-6 py-4 font-sans text-base font-semibold text-white transition-all duration-300 hover:scale-[1.02]"
                  >
                    <span>{t('getInTouch')}</span>
                    <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
                  </Link>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </motion.header>
  );
}

