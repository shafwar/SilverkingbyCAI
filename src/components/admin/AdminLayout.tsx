"use client";

import { ReactNode, useState, useMemo, useEffect } from "react";
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
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isClosing, setIsClosing] = useState(false);

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

  const renderNavItem = (
    item: (typeof navItems)[number],
    mode: "sidebar" | "col",
    isMobile: boolean
  ) => {
    const Icon = item.icon;
    const active = pathname === item.href;
    const isExternal = (item as { isExternal?: boolean }).isExternal;

    const linkClassName = clsx(
      "flex w-full min-w-0 items-center border border-transparent text-left transition touch-manipulation",
      mode === "sidebar" &&
        "gap-3 rounded-xl px-3 py-2.5 text-[13px] font-medium leading-snug tracking-wide",
      mode === "col" &&
        "h-11 shrink-0 gap-3 rounded-full px-4 text-sm font-medium leading-none tracking-wide whitespace-nowrap",
      active
        ? "border-[#FFD700]/30 bg-white/[0.1] font-semibold text-white shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)] ring-1 ring-[#FFD700]/35"
        : "text-white/75 hover:border-white/10 hover:bg-white/[0.06] hover:text-white"
    );

    const iconClassName = clsx(
      "shrink-0",
      mode === "col" ? "h-5 w-5" : "h-[18px] w-[18px]",
      active ? "text-[#FFD700]" : "text-white/55"
    );

    const labelEl = (
      <span
        className={clsx(
          "leading-snug",
          mode === "sidebar" && "min-w-0 flex-1 truncate"
        )}
      >
        {item.label}
      </span>
    );

    if (isMobile) {
      return (
        <button
          key={item.href}
          type="button"
          onClick={() => handleMenuLinkClick(item.href, isExternal)}
          className={linkClassName}
          onMouseEnter={() => {
            if (!isExternal) {
              try {
                router.prefetch(item.href);
              } catch {
                // ignore
              }
            }
          }}
        >
          <Icon className={iconClassName} aria-hidden />
          {labelEl}
        </button>
      );
    }

    if (isExternal) {
      return (
        <a
          key={item.href}
          href={item.href}
          className={linkClassName}
          onMouseEnter={() => {
            try {
              const prefetchLink = document.createElement("link");
              prefetchLink.rel = "prefetch";
              prefetchLink.as = "document";
              prefetchLink.href = item.href;
              document.head.appendChild(prefetchLink);
            } catch {
              // ignore
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
          try {
            router.prefetch(item.href);
          } catch {
            // ignore
          }
        }}
      >
        <Icon className={iconClassName} aria-hidden />
        {labelEl}
      </Link>
    );
  };

  const renderLinks = (mode: "sidebar" | "col", isMobile: boolean) =>
    navItems.map((item) => renderNavItem(item, mode, isMobile));

  return (
    <div className="min-h-screen overflow-x-hidden bg-black text-white supports-[height:100dvh]:min-h-[100dvh]">
      {/* Mobile: bar atas ringkas */}
      <header className="fixed inset-x-0 top-0 z-40 flex h-14 items-center justify-between border-b border-white/[0.08] bg-black/95 px-4 pt-[env(safe-area-inset-top,0px)] backdrop-blur-xl lg:hidden">
        <Link
          href="/admin"
          prefetch={true}
          className="group flex items-center gap-2"
          onMouseEnter={() => {
            try {
              router.prefetch("/admin");
            } catch {
              // ignore
            }
          }}
        >
          <div className="relative h-9 w-9 shrink-0 transition-transform duration-300 group-hover:scale-105">
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
          <div className="min-w-0">
            <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-white/45">
              Silver King
            </p>
            <p className="truncate text-sm font-semibold text-white">Command</p>
          </div>
        </Link>
        <button
          type="button"
          onClick={() => setMobileOpen((prev) => !prev)}
          className="rounded-xl border border-white/15 p-2.5 text-white touch-manipulation hover:bg-white/10"
          aria-label="Buka menu"
        >
          <Menu className="h-5 w-5" />
        </button>
      </header>

      {/* Desktop: sidebar kiri */}
      <aside
        className="fixed bottom-0 left-0 top-0 z-30 hidden w-[260px] flex-col border-r border-white/[0.08] bg-[#060606] pt-[env(safe-area-inset-top,0px)] pb-[env(safe-area-inset-bottom,0px)] lg:flex"
        aria-label="Navigasi admin"
      >
        <div className="flex min-h-0 flex-1 flex-col">
          <div className="shrink-0 border-b border-white/[0.06] px-4 py-5">
            <Link
              href="/admin"
              prefetch={true}
              className="group flex items-center gap-3"
              onMouseEnter={() => {
                try {
                  router.prefetch("/admin");
                } catch {
                  // ignore
                }
              }}
            >
              <div className="relative h-10 w-10 shrink-0 transition-transform duration-300 group-hover:scale-105">
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
              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/45">
                  Silver King
                </p>
                <p className="truncate text-sm font-semibold text-white">Command</p>
              </div>
            </Link>
          </div>

          <nav
            className="min-h-0 flex-1 space-y-0.5 overflow-y-auto overflow-x-hidden px-3 py-3"
            aria-label="Menu admin"
          >
            {renderLinks("sidebar", false)}
          </nav>

          <div className="shrink-0 space-y-2 border-t border-white/[0.06] px-3 py-4">
            <LanguageSwitcher variant="adminNav" />
            <button
              type="button"
              onClick={handleSignOut}
              className="flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-[#FFD700]/40 bg-[#FFD700]/12 text-[13px] font-semibold text-white transition hover:border-[#FFD700]/55 hover:bg-[#FFD700]/22"
            >
              <LogOut className="h-4 w-4 shrink-0 opacity-90" aria-hidden />
              {safeT(t, "logout", "Logout")}
            </button>
          </div>
        </div>
      </aside>

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

      <main className="mx-auto max-w-[1800px] min-w-0 px-4 pb-[max(2rem,env(safe-area-inset-bottom,0px))] pt-[calc(3.5rem+env(safe-area-inset-top,0px))] pl-[max(1rem,env(safe-area-inset-left,0px))] pr-[max(1rem,env(safe-area-inset-right,0px))] sm:px-5 sm:pb-[max(2.5rem,env(safe-area-inset-bottom,0px))] md:px-8 md:pb-[max(3rem,env(safe-area-inset-bottom,0px))] lg:ml-[260px] lg:pl-8 lg:pr-10 lg:pt-8 lg:pb-10">
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
