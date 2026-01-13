"use client";

import { ReactNode, useState, useMemo, useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import { useTranslations, useLocale } from "next-intl";
import { motion, AnimatePresence } from "framer-motion";
import { Toaster } from "sonner";
import { getR2UrlClient } from "@/utils/r2-url";
import { DownloadCard } from "./DownloadCard";
import { useDownload } from "@/contexts/DownloadContext";
import {
  LayoutDashboard,
  PackageSearch,
  QrCode,
  ActivitySquare,
  BarChart3,
  Menu,
  X,
  LogOut,
  Edit3,
  MessageSquare,
} from "lucide-react";
import clsx from "clsx";
import LanguageSwitcher from "@/components/layout/LanguageSwitcher";

type AdminLayoutProps = {
  children: ReactNode;
  email?: string | null;
};

export function AdminLayout({ children, email }: AdminLayoutProps) {
  // Always call hooks unconditionally
  const t = useTranslations("admin");
  const tDashboard = useTranslations("admin.dashboard");
  const tExport = useTranslations("admin.export");
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isNavHidden, setIsNavHidden] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const lastScrollYRef = useRef(0);

  // Get download state from context
  const { downloadState, cancelDownload, setIsDownloadMinimized } = useDownload();

  // Safe translation helper with fallback
  const safeT = useMemo(
    () =>
      (
        translator: ReturnType<typeof useTranslations>,
        key: string,
        fallback: string = key
      ): string => {
        try {
          const result = translator(key);
          // If next-intl returns the key itself (missing translation), use fallback
          return result === key ? fallback : result;
        } catch (error) {
          console.error(`[AdminLayout] Translation error for key "${key}":`, error);
          return fallback;
        }
      },
    []
  );

  // Memoize navItems untuk memastikan re-render saat translations berubah
  const navItems = useMemo(
    () => [
      { label: safeT(tDashboard, "label", "Dashboard"), href: "/admin", icon: LayoutDashboard },
      { label: safeT(t, "products", "Products"), href: "/admin/products", icon: PackageSearch },
      { label: "CMS Products", href: `/${locale}/products`, icon: Edit3, isExternal: true },
      { label: safeT(t, "qrPreview", "QR Preview"), href: "/admin/qr-preview", icon: QrCode },
      { label: safeT(t, "logs", "Logs"), href: "/admin/logs", icon: ActivitySquare },
      { label: safeT(t, "analyticsLabel", "Analytics"), href: "/admin/analytics", icon: BarChart3 },
      {
        label: safeT(t, "feedback.label", "Feedback"),
        href: "/admin/feedback",
        icon: MessageSquare,
      },
    ],
    [t, tDashboard, safeT, locale]
  );

  // Aggressive prefetching for all admin routes on mount
  useEffect(() => {
    if (typeof window === "undefined") return;

    const adminRoutes = [
      "/admin",
      "/admin/products",
      "/admin/qr-preview",
      "/admin/logs",
      "/admin/analytics",
      "/admin/feedback",
    ];

    // Prefetch all admin routes immediately
    adminRoutes.forEach((route) => {
      try {
        router.prefetch(route);
      } catch (e) {
        // Silently fail
      }
    });

    // Also prefetch using browser link prefetch for better caching
    adminRoutes.forEach((route) => {
      try {
        const existingLink = document.querySelector(`link[rel="prefetch"][href="${route}"]`);
        if (!existingLink) {
          const prefetchLink = document.createElement("link");
          prefetchLink.rel = "prefetch";
          prefetchLink.as = "document";
          prefetchLink.href = route;
          document.head.appendChild(prefetchLink);
        }
      } catch (e) {
        // Silently fail
      }
    });
  }, [router]);

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  // Dynamic navbar behavior based on scroll direction
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (mobileOpen) return; // Don't hide navbar when menu is open

    const handleScroll = () => {
      const currentY = window.scrollY || 0;
      const lastY = lastScrollYRef.current;

      // Jika scroll ke bawah dan sudah lewat beberapa px dari atas, sembunyikan navbar
      if (currentY > lastY && currentY > 80) {
        setIsNavHidden(true);
      } else {
        // Jika scroll ke atas, tampilkan kembali navbar
        setIsNavHidden(false);
      }

      lastScrollYRef.current = currentY;
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [mobileOpen]);

  const handleSignOut = async () => {
    await signOut({ redirect: false });
    // Redirect to homepage after logout
    window.location.href = "https://cahayasilverking.id/";
  };

  const handleCloseMenu = () => {
    setIsClosing(true);
    setTimeout(() => {
      setMobileOpen(false);
      setIsClosing(false);
    }, 300); // Reduced from 400ms for faster feel
  };

  const handleMenuLinkClick = (href: string, isExternal: boolean = false) => {
    // Prefetch immediately before closing menu for faster navigation
    if (!isExternal) {
      try {
        router.prefetch(href);
        // Also use browser prefetch for additional speed
        const prefetchLink = document.createElement("link");
        prefetchLink.rel = "prefetch";
        prefetchLink.as = "document";
        prefetchLink.href = href;
        document.head.appendChild(prefetchLink);
      } catch (e) {
        // Silently fail
      }
    }
    
    // Navigate immediately for external links, or after short delay for internal
    if (isExternal) {
      window.location.href = href;
    } else {
      // Start navigation immediately while closing menu
      router.push(href);
      handleCloseMenu();
    }
  };

  const renderLinks = (orientation: "row" | "col", isMobile: boolean = false) =>
    navItems.map((item) => {
      const Icon = item.icon;
      const active = pathname === item.href;
      const isExternal = (item as any).isExternal;

      const linkClassName = clsx(
        "flex items-center gap-2 rounded-full px-3 sm:px-3.5 py-2 sm:py-2.5 text-[11px] sm:text-xs transition touch-manipulation",
        orientation === "col" ? "w-full justify-start" : "justify-center",
        active
          ? "bg-white/10 text-white font-medium"
          : "text-white/70 hover:text-white hover:bg-white/5"
      );

      const iconClassName = clsx(
        "h-3.5 w-3.5 sm:h-4 sm:w-4",
        active ? "text-[#FFD700]" : "text-white/50"
      );

      // For mobile menu, use button with navigation handler
      if (isMobile) {
        return (
          <button
            key={item.href}
            onClick={() => handleMenuLinkClick(item.href, isExternal)}
            className={linkClassName}
            onMouseEnter={() => {
              // Prefetch on hover even in mobile menu for faster navigation
              if (!isExternal) {
                try {
                  router.prefetch(item.href);
                } catch (e) {
                  // Silently fail
                }
              }
            }}
          >
            <Icon className={iconClassName} />
            {item.label}
          </button>
        );
      }

      // For desktop, use Link with prefetch or <a>
      if (isExternal) {
        return (
          <a 
            key={item.href} 
            href={item.href} 
            className={linkClassName}
            onMouseEnter={() => {
              // Prefetch on hover for external links
              try {
                const prefetchLink = document.createElement("link");
                prefetchLink.rel = "prefetch";
                prefetchLink.as = "document";
                prefetchLink.href = item.href;
                document.head.appendChild(prefetchLink);
              } catch (e) {
                // Silently fail
              }
            }}
          >
            <Icon className={iconClassName} />
            {item.label}
          </a>
        );
      }

      return (
        <Link 
          key={item.href} 
          href={item.href} 
          prefetch={true}
          className={linkClassName}
          onMouseEnter={() => {
            // Aggressive hover prefetching for instant navigation
            try {
              router.prefetch(item.href);
            } catch (e) {
              // Silently fail
            }
          }}
        >
          <Icon className={iconClassName} />
          {item.label}
        </Link>
      );
    });

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-[#050505] to-[#050505] text-white">
      <motion.nav
        initial={{ opacity: 0, y: -10 }}
        animate={
          isNavHidden && !mobileOpen
            ? { y: -80, opacity: 0.98 }
            : { y: 0, opacity: mobileOpen ? 0 : 1 }
        }
        transition={{ duration: 0.25, ease: "easeInOut" }}
        className={clsx(
          "fixed inset-x-0 top-0 z-40 bg-black/80 backdrop-blur-2xl transition-all duration-300",
          mobileOpen ? "border-b-0" : "border-b border-white/5"
        )}
      >
        <div className="mx-auto flex max-w-[1400px] items-center justify-between px-4 sm:px-5 md:px-6 py-2.5 sm:py-3">
          <Link 
            href="/admin" 
            prefetch={true}
            className="flex items-center group"
            onMouseEnter={() => {
              try {
                router.prefetch("/admin");
              } catch (e) {
                // Silently fail
              }
            }}
          >
            <div className="relative h-7 w-7 sm:h-8 sm:w-8 transition-transform duration-300 group-hover:scale-110">
              <Image
                src={getR2UrlClient("/images/cai-logo.png")}
                alt="CAI Logo - Silver King by CAI"
                fill
                className="object-contain"
                style={{
                  filter: "brightness(0) invert(1) drop-shadow(0 0 8px rgba(255, 255, 255, 0.2))",
                }}
                priority
                unoptimized
              />
            </div>
          </Link>
          <div className="hidden items-center gap-1 sm:gap-1.5 lg:flex">{renderLinks("row")}</div>
          <div className="flex items-center gap-2 sm:gap-2.5">
            <div className="hidden sm:block">
              <LanguageSwitcher />
            </div>
            <button
              onClick={handleSignOut}
              className="hidden rounded-full border border-white/15 bg-gradient-to-r from-[#FFD700]/30 to-[#E5C100]/20 px-2.5 sm:px-3 py-1 sm:py-1.5 text-[10px] sm:text-xs font-medium text-white transition hover:border-[#FFD700]/50 sm:inline-flex"
            >
              {safeT(t, "logout", "Logout")}
            </button>
            <button
              onClick={() => setMobileOpen((prev) => !prev)}
              className="rounded-full border border-white/15 p-2 text-white lg:hidden touch-manipulation"
              aria-label="Toggle navigation"
            >
              <Menu className="h-5 w-5" />
            </button>
          </div>
        </div>
      </motion.nav>

      {/* Full Screen Mobile Menu Overlay */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ y: "-100%", opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: "-100%", opacity: 0 }}
            transition={{
              duration: 0.4,
              ease: [0.25, 0.1, 0.25, 1], // Custom easing for premium feel
            }}
            className="fixed inset-0 z-[101] bg-gradient-to-br from-black via-[#050505] to-[#050505] lg:hidden overflow-y-auto"
            style={{ willChange: "transform" }}
          >
            {/* Menu Header */}
            <div className="flex items-center justify-between px-4 sm:px-5 md:px-6 py-4 sm:py-5 border-b border-white/[0.03]">
              <Link 
                href="/admin" 
                prefetch={true}
                className="flex items-center group" 
                onClick={handleCloseMenu}
                onMouseEnter={() => {
                  try {
                    router.prefetch("/admin");
                  } catch (e) {
                    // Silently fail
                  }
                }}
              >
                <div className="relative h-7 w-7 sm:h-8 sm:w-8 transition-transform duration-300 group-hover:scale-110">
                  <Image
                    src={getR2UrlClient("/images/cai-logo.png")}
                    alt="CAI Logo - Silver King by CAI"
                    fill
                    className="object-contain"
                    style={{
                      filter:
                        "brightness(0) invert(1) drop-shadow(0 0 8px rgba(255, 255, 255, 0.2))",
                    }}
                    priority
                    unoptimized
                  />
                </div>
              </Link>
              <button
                onClick={handleCloseMenu}
                className="rounded-full border border-white/15 p-2 text-white touch-manipulation hover:bg-white/10 transition-colors"
                aria-label="Close menu"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Menu Content */}
            <div className="px-4 sm:px-5 md:px-6 py-6 sm:py-8">
              {/* Navigation Links */}
              <div className="flex flex-col gap-1.5 sm:gap-2 pb-6 sm:pb-8 border-b border-white/[0.03]">
                {renderLinks("col", true)}
              </div>

              {/* Bottom Actions Section */}
              <div className="mt-6 sm:mt-8 space-y-4 sm:space-y-5">
                {/* Language Switcher */}
                <div className="relative">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[10px] sm:text-xs text-white/50 uppercase tracking-wider">
                      Language
                    </span>
                  </div>
                  <div className="relative z-10 min-h-[44px]">
                    <LanguageSwitcher />
                  </div>
                </div>

                {/* Divider */}
                <div className="h-px bg-white/[0.03]" />

                {/* Logout Button */}
                <button
                  onClick={() => {
                    handleCloseMenu();
                    setTimeout(() => handleSignOut(), 400);
                  }}
                  className="w-full inline-flex items-center justify-center gap-2 rounded-lg border border-white/20 bg-white/5 hover:bg-white/10 px-4 py-3 sm:py-3.5 text-xs sm:text-sm font-medium text-white transition-all duration-200 hover:border-[#FFD700]/40 touch-manipulation active:scale-[0.98]"
                >
                  <LogOut className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  {safeT(t, "logout", "Logout")}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <main className="mx-auto max-w-[1400px] px-4 sm:px-5 md:px-6 pb-8 sm:pb-10 md:pb-12 pt-16 sm:pt-20 md:pt-24 lg:pt-28">
        {children}
      </main>

      <Toaster
        position="top-center"
        richColors
        closeButton
        duration={4000}
        toastOptions={{
          className: "toast-minimalist",
          style: {
            background: "rgba(0, 0, 0, 0.95)",
            border: "1px solid rgba(255, 255, 255, 0.08)",
            borderRadius: "8px",
            color: "#fff",
            backdropFilter: "blur(16px)",
            maxWidth: "420px",
            padding: "12px 16px",
            fontSize: "14px",
            fontWeight: 400,
            boxShadow: "0 4px 16px rgba(0, 0, 0, 0.3)",
          },
          classNames: {
            success: "toast-success",
            error: "toast-error",
            info: "toast-info",
            warning: "toast-warning",
          },
        }}
      />

      {/* Global Download Card - persists across navigation */}
      {downloadState.percent !== null && (
        <DownloadCard
          percent={downloadState.percent}
          label={downloadState.label}
          onCancel={cancelDownload}
          isMinimized={downloadState.isMinimized}
          onToggleMinimize={() => setIsDownloadMinimized(!downloadState.isMinimized)}
        />
      )}
    </div>
  );
}
