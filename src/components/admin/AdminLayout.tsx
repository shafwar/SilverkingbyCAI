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
  BookOpen,
  LayoutTemplate,
  AlertTriangle,
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
      {
        label: safeT(t, "zipIssuesNav", "ZIP issues"),
        href: "/admin/qr-preview/zip-issues",
        icon: AlertTriangle,
      },
      {
        label: safeT(t, "serticardNav", "Serticard"),
        href: "/admin/serticard",
        icon: LayoutTemplate,
      },
      { label: safeT(t, "logs", "Logs"), href: "/admin/logs", icon: ActivitySquare },
      { label: safeT(t, "analyticsLabel", "Analytics"), href: "/admin/analytics", icon: BarChart3 },
      {
        label: safeT(t, "feedback.label", "Feedback"),
        href: "/admin/feedback",
        icon: MessageSquare,
      },
      { label: safeT(t, "journalNav", "Journal"), href: "/admin/journal", icon: BookOpen },
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
      "/admin/qr-preview/page2",
      "/admin/qr-preview/zip-issues",
      "/admin/serticard",
      "/admin/logs",
      "/admin/analytics",
      "/admin/feedback",
      "/admin/journal",
      "/admin/journal/new",
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
      const isDesktopRow = orientation === "row" && !isMobile;

      const linkClassName = clsx(
        "inline-flex shrink-0 items-center rounded-full border border-transparent font-medium leading-none tracking-wide transition touch-manipulation whitespace-nowrap",
        orientation === "col"
          ? "h-11 w-full justify-start gap-2.5 px-4 text-sm"
          : "h-9 justify-center gap-1 px-1.5 text-[11px] sm:gap-1.5 sm:px-2 md:gap-2 md:px-2 md:text-[12px] lg:px-2.5 xl:h-10 xl:gap-2 xl:px-3 xl:text-[12px] 2xl:px-3.5 2xl:text-[13px]",
        active
          ? "border-[#FFD700]/35 bg-white/[0.12] font-semibold text-white shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)] ring-1 ring-[#FFD700]/45"
          : "text-white/80 hover:border-white/10 hover:bg-white/[0.08] hover:text-white"
      );

      const iconClassName = clsx(
        "shrink-0",
        isDesktopRow
          ? "h-3.5 w-3.5 md:h-[15px] md:w-[15px] xl:h-[17px] xl:w-[17px] 2xl:h-[18px] 2xl:w-[18px]"
          : "h-5 w-5",
        active ? "text-[#FFD700]" : "text-white/60"
      );

      const labelEl = <span className="leading-none">{item.label}</span>;

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
            <Icon className={iconClassName} aria-hidden />
            {labelEl}
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
            <Icon className={iconClassName} aria-hidden />
            {labelEl}
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
          <Icon className={iconClassName} aria-hidden />
          {labelEl}
        </Link>
      );
    });

  return (
    <div className="min-h-screen overflow-x-clip bg-black text-white supports-[height:100dvh]:min-h-[100dvh]">
      <motion.nav
        initial={{ opacity: 0, y: -10 }}
        animate={
          isNavHidden && !mobileOpen
            ? { y: -100, opacity: 0.98 }
            : { y: 0, opacity: mobileOpen ? 0 : 1 }
        }
        transition={{ duration: 0.25, ease: "easeInOut" }}
        className={clsx(
          "fixed inset-x-0 top-0 z-40 overflow-x-clip border-b border-white/[0.07] bg-black/90 backdrop-blur-2xl transition-all duration-300 shadow-[0_8px_32px_rgba(0,0,0,0.45)]",
          mobileOpen ? "border-b-0 shadow-none" : ""
        )}
      >
        <div className="pt-[env(safe-area-inset-top,0px)]">
          <div className="mx-auto flex min-h-[4.25rem] w-full max-w-[1920px] items-stretch px-3 sm:px-4 md:px-5 lg:px-6 xl:px-8">
            {/* Logo - Left */}
            <div className="flex w-[96px] shrink-0 items-center border-r border-[#FFD700]/20 pr-3 sm:w-[108px] md:w-[118px] md:pr-3.5">
              <Link
                href="/admin"
                prefetch={true}
                className="group flex items-center"
                onMouseEnter={() => {
                  try {
                    router.prefetch("/admin");
                  } catch (e) {
                    // Silently fail
                  }
                }}
              >
                <div className="relative h-8 w-8 sm:h-9 sm:w-9 transition-transform duration-300 group-hover:scale-110">
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
            </div>

            {/* Navigation Links - Center: satu baris, tanpa scroll horizontal — ukuran adaptif lebar layar */}
            <div className="hidden min-h-[4.25rem] min-w-0 flex-1 items-center justify-center overflow-visible py-2 lg:flex">
              <div className="flex w-full min-w-0 flex-nowrap items-center justify-center gap-x-1 px-0.5 sm:gap-x-1.5 md:gap-x-2 xl:gap-x-2.5">
                {renderLinks("row")}
              </div>
            </div>

            {/* Actions - Right */}
            <div className="flex min-h-[4.25rem] w-[168px] shrink-0 items-center justify-end gap-2 border-l border-white/10 pl-3 sm:w-[178px] sm:gap-2 sm:pl-3.5 md:w-[188px]">
              <div className="hidden sm:block">
                <LanguageSwitcher variant="adminNav" />
              </div>
              <button
                type="button"
                onClick={handleSignOut}
                className="hidden h-9 min-h-9 shrink-0 items-center justify-center rounded-full border border-[#FFD700]/40 bg-[#FFD700]/14 px-2.5 text-[11px] font-semibold tracking-wide text-white transition hover:border-[#FFD700]/60 hover:bg-[#FFD700]/24 sm:inline-flex md:px-3 xl:h-10 xl:min-h-10 xl:px-3.5 xl:text-xs"
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
            className="fixed inset-0 z-[101] bg-black lg:hidden overflow-y-auto overflow-x-hidden overscroll-y-contain pt-[env(safe-area-inset-top,0px)] pb-[env(safe-area-inset-bottom,0px)]"
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

      <main className="mx-auto max-w-[1920px] min-w-0 pl-[max(1rem,env(safe-area-inset-left,0px))] pr-[max(1rem,env(safe-area-inset-right,0px))] pb-[max(2rem,env(safe-area-inset-bottom,0px))] pt-[calc(4.5rem+env(safe-area-inset-top,0px))] sm:pl-6 sm:pr-6 sm:pb-[max(2.5rem,env(safe-area-inset-bottom,0px))] sm:pt-[calc(5rem+env(safe-area-inset-top,0px))] md:px-8 md:pb-[max(3rem,env(safe-area-inset-bottom,0px))] md:pt-[calc(5.5rem+env(safe-area-inset-top,0px))] lg:pt-[calc(5.5rem+env(safe-area-inset-top,0px))]">
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
