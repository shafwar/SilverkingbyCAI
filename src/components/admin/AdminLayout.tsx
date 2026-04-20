"use client";

import { ReactNode, useState, useMemo, useEffect, useCallback } from "react";
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
import type { LucideIcon } from "lucide-react";
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
  ChevronLeft,
} from "lucide-react";
import clsx from "clsx";
import LanguageSwitcher from "@/components/layout/LanguageSwitcher";

type AdminLayoutProps = {
  children: ReactNode;
  email?: string | null;
};

const ADMIN_SIDEBAR_COLLAPSED_KEY = "sk-admin-sidebar-collapsed";

type AdminNavLinkItem = {
  label: string;
  href: string;
  icon: LucideIcon;
  isExternal?: boolean;
};

type AdminNavSection = { title: string; items: AdminNavLinkItem[] };

export function AdminLayout({ children, email }: AdminLayoutProps) {
  // Always call hooks unconditionally
  const t = useTranslations("admin");
  const tDashboard = useTranslations("admin.dashboard");
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      setSidebarCollapsed(localStorage.getItem(ADMIN_SIDEBAR_COLLAPSED_KEY) === "1");
    } catch {
      // ignore
    }
  }, []);

  const toggleAdminSidebar = useCallback(() => {
    setSidebarCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(ADMIN_SIDEBAR_COLLAPSED_KEY, next ? "1" : "0");
      } catch {
        // ignore
      }
      return next;
    });
  }, []);

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

  const navSections: AdminNavSection[] = useMemo(
    () => [
      {
        title: safeT(t, "sidebarSectionPrimary", "Products & verification"),
        items: [
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
        ],
      },
      {
        title: safeT(t, "sidebarSectionSecondary", "Intelligence & content"),
        items: [
          { label: safeT(t, "logs", "Logs"), href: "/admin/logs", icon: ActivitySquare },
          { label: safeT(t, "analyticsLabel", "Analytics"), href: "/admin/analytics", icon: BarChart3 },
          {
            label: safeT(t, "feedback.label", "Feedback"),
            href: "/admin/feedback",
            icon: MessageSquare,
          },
          { label: safeT(t, "journalNav", "Journal"), href: "/admin/journal", icon: BookOpen },
        ],
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

  const renderNavItem = (item: AdminNavLinkItem, mode: "sidebar" | "col", isMobile: boolean) => {
    const Icon = item.icon;
    const active = pathname === item.href;
    const isExternal = (item as { isExternal?: boolean }).isExternal;

    const linkClassName = clsx(
      "flex w-full min-w-0 items-center border border-transparent text-left transition-[background-color,border-color,color,box-shadow,ring-width] duration-200 touch-manipulation",
      mode === "sidebar" &&
        clsx(
          "gap-3 rounded-xl py-2.5 text-[13px] font-medium leading-snug tracking-wide",
          sidebarCollapsed ? "justify-center px-2" : "px-3"
        ),
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
          mode === "sidebar" && !sidebarCollapsed && "min-w-0 flex-1 truncate",
          mode === "sidebar" && sidebarCollapsed && "sr-only"
        )}
      >
        {item.label}
      </span>
    );

    const collapsedSidebarTitle =
      mode === "sidebar" && sidebarCollapsed && !isMobile ? item.label : undefined;

    if (isMobile) {
      return (
        <button
          key={item.href}
          type="button"
          onClick={() => handleMenuLinkClick(item.href, isExternal)}
          className={linkClassName}
          title={collapsedSidebarTitle}
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
          title={collapsedSidebarTitle}
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
        title={collapsedSidebarTitle}
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

  const renderSidebarNav = () =>
    navSections.map((section, sIdx) => (
      <div
        key={section.title}
        className={clsx(
          sIdx > 0 &&
            (sidebarCollapsed ? "mt-1.5" : "mt-2 border-t border-white/[0.06] pt-2")
        )}
      >
        {!sidebarCollapsed && (
          <p className="mb-1.5 truncate px-3 text-[9px] font-semibold uppercase tracking-[0.16em] text-white/38">
            {section.title}
          </p>
        )}
        <div className="space-y-0.5">
          {section.items.map((item) => renderNavItem(item, "sidebar", false))}
        </div>
      </div>
    ));

  const renderMobileNavSections = () =>
    navSections.map((section) => (
      <div key={section.title} className="flex flex-col gap-1.5 sm:gap-2">
        <p className="px-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-white/45">
          {section.title}
        </p>
        {section.items.map((item) => renderNavItem(item, "col", true))}
      </div>
    ));

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
          <div className="relative h-9 w-9 shrink-0 transition-transform duration-200 ease-out group-hover:scale-105">
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
        className={clsx(
          "fixed inset-y-0 left-0 z-30 hidden h-[100dvh] max-h-[100dvh] flex-col overflow-x-hidden border-r border-white/[0.08] bg-[#060606] pt-[env(safe-area-inset-top,0px)] pb-[env(safe-area-inset-bottom,0px)] lg:flex lg:[contain:layout] motion-reduce:transition-none",
          "transition-[width] duration-200 ease-out",
          sidebarCollapsed ? "w-[76px]" : "w-[260px]"
        )}
        aria-label="Navigasi admin"
        data-collapsed={sidebarCollapsed ? "true" : "false"}
      >
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <div
            className={clsx(
              "shrink-0 border-b border-white/[0.06] py-5",
              sidebarCollapsed ? "px-2" : "px-4"
            )}
          >
            <div
              className={clsx(
                "flex items-center",
                sidebarCollapsed ? "flex-col gap-3" : "gap-2"
              )}
            >
              <Link
                href="/admin"
                prefetch={true}
                className={clsx(
                  "group flex min-w-0 items-center transition-opacity",
                  sidebarCollapsed ? "justify-center" : "min-w-0 flex-1 gap-3"
                )}
                onMouseEnter={() => {
                  try {
                    router.prefetch("/admin");
                  } catch {
                    // ignore
                  }
                }}
                title={sidebarCollapsed ? "Dashboard" : undefined}
              >
                <div className="relative h-10 w-10 shrink-0 transition-transform duration-200 ease-out group-hover:scale-105">
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
                {!sidebarCollapsed && (
                  <div className="min-w-0">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/45">
                      Silver King
                    </p>
                    <p className="truncate text-sm font-semibold text-white">Command</p>
                  </div>
                )}
              </Link>
              <button
                type="button"
                onClick={toggleAdminSidebar}
                className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-white/15 text-white/80 transition-colors duration-200 hover:bg-white/10 hover:text-white"
                aria-expanded={!sidebarCollapsed}
                aria-controls="admin-sidebar-nav"
                aria-label={sidebarCollapsed ? "Perluas sidebar" : "Ciutkan sidebar"}
              >
                <ChevronLeft
                  className={clsx(
                    "h-4 w-4 motion-reduce:transition-none motion-reduce:duration-0",
                    "transition-transform duration-200 ease-out",
                    sidebarCollapsed && "rotate-180"
                  )}
                  aria-hidden
                />
              </button>
            </div>
          </div>

          <nav
            id="admin-sidebar-nav"
            className={clsx(
              "min-h-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-y-contain py-2 [scrollbar-color:rgba(255,255,255,0.22)_transparent] [scrollbar-width:thin] [&::-webkit-scrollbar]:w-[5px] [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-white/20 [&::-webkit-scrollbar-thumb]:hover:bg-white/30 [&::-webkit-scrollbar-track]:bg-transparent",
              sidebarCollapsed ? "px-2" : "px-3"
            )}
            aria-label="Menu admin"
          >
            {renderSidebarNav()}
          </nav>

          <div
            className={clsx(
              "shrink-0 space-y-2 border-t border-white/[0.06] py-4",
              sidebarCollapsed ? "px-2" : "px-3"
            )}
          >
            <div className={sidebarCollapsed ? "flex justify-center" : undefined}>
              <LanguageSwitcher variant="adminNav" adminNavCollapsed={sidebarCollapsed} />
            </div>
            <button
              type="button"
              onClick={handleSignOut}
              className={clsx(
                "flex h-10 items-center justify-center gap-2 rounded-xl border border-[#FFD700]/40 bg-[#FFD700]/12 text-[13px] font-semibold text-white transition-colors duration-200 hover:border-[#FFD700]/55 hover:bg-[#FFD700]/22",
                sidebarCollapsed ? "mx-auto h-10 w-10 min-w-10 shrink-0 px-0" : "w-full"
              )}
              title={sidebarCollapsed ? safeT(t, "logout", "Logout") : undefined}
              aria-label={safeT(t, "logout", "Logout")}
            >
              <LogOut className="h-4 w-4 shrink-0 opacity-90" aria-hidden />
              {!sidebarCollapsed && <span>{safeT(t, "logout", "Logout")}</span>}
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
              duration: 0.28,
              ease: [0.25, 0.1, 0.25, 1],
            }}
            className="fixed inset-0 z-[101] bg-black lg:hidden overflow-y-auto overflow-x-hidden overscroll-y-contain pt-[env(safe-area-inset-top,0px)] pb-[env(safe-area-inset-bottom,0px)]"
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
              <div className="flex flex-col gap-4 sm:gap-5 pb-6 sm:pb-8 border-b border-white/[0.03]">
                {renderMobileNavSections()}
              </div>

              {/* Bottom Actions Section */}
              <div className="mt-6 sm:mt-8 space-y-4 sm:space-y-5">
                {/* Language Switcher */}
                <div className="relative">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[10px] sm:text-xs text-white/50 uppercase tracking-wider">
                      {safeT(t, "languageToggleEyebrow", "Admin interface language")}
                    </span>
                  </div>
                  <div className="relative z-10 min-h-[44px]">
                    <LanguageSwitcher variant="adminNav" />
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

      <main
        className={clsx(
          "mx-auto max-w-[1800px] min-w-0 px-4 pb-[max(2rem,env(safe-area-inset-bottom,0px))] pt-[calc(3.5rem+env(safe-area-inset-top,0px))] pl-[max(1rem,env(safe-area-inset-left,0px))] pr-[max(1rem,env(safe-area-inset-right,0px))] sm:px-5 sm:pb-[max(2.5rem,env(safe-area-inset-bottom,0px))] md:px-8 md:pb-[max(3rem,env(safe-area-inset-bottom,0px))] lg:pl-8 lg:pr-10 lg:pt-8 lg:pb-10",
          "motion-reduce:transition-none transition-[margin-left] duration-200 ease-out",
          sidebarCollapsed ? "lg:ml-[76px]" : "lg:ml-[260px]"
        )}
      >
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
