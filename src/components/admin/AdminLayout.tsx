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
  LogOut,
  Edit3,
} from "lucide-react";
import clsx from "clsx";
import LanguageSwitcher from "@/components/layout/LanguageSwitcher";

type AdminLayoutProps = {
  children: ReactNode;
  email?: string | null;
};

export function AdminLayout({ children, email }: AdminLayoutProps) {
  // Always call hooks unconditionally
  const t = useTranslations('admin');
  const tDashboard = useTranslations('admin.dashboard');
  const tExport = useTranslations('admin.export');
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isNavHidden, setIsNavHidden] = useState(false);
  const lastScrollYRef = useRef(0);
  
  // Get download state from context
  const { downloadState, cancelDownload, setIsDownloadMinimized } = useDownload();
  
  // Safe translation helper with fallback
  const safeT = useMemo(
    () => (translator: ReturnType<typeof useTranslations>, key: string, fallback: string = key): string => {
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
  const navItems = useMemo(() => [
    { label: safeT(tDashboard, 'label', 'Dashboard'), href: "/admin", icon: LayoutDashboard },
    { label: safeT(t, 'products', 'Products'), href: "/admin/products", icon: PackageSearch },
    { label: 'CMS Products', href: `/${locale}/products`, icon: Edit3, isExternal: true },
    { label: safeT(t, 'qrPreview', 'QR Preview'), href: "/admin/qr-preview", icon: QrCode },
    { label: safeT(t, 'logs', 'Logs'), href: "/admin/logs", icon: ActivitySquare },
    { label: safeT(t, 'analyticsLabel', 'Analytics'), href: "/admin/analytics", icon: BarChart3 },
  ], [t, tDashboard, safeT, locale]);

  // Dynamic navbar behavior based on scroll direction
  useEffect(() => {
    if (typeof window === "undefined") return;

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
  }, []);

  const handleSignOut = async () => {
    await signOut({ redirect: false });
    // Redirect to homepage after logout
    window.location.href = "https://cahayasilverking.id/";
  };

  const renderLinks = (orientation: "row" | "col") =>
    navItems.map((item) => {
      const Icon = item.icon;
      const active = pathname === item.href;
      
      // For external links (like CMS to public products page), use <a> instead of <Link>
      if ((item as any).isExternal) {
        return (
          <a
            key={item.href}
            href={item.href}
            onClick={() => setMobileOpen(false)}
            className={clsx(
              "flex items-center gap-2 rounded-full px-3 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm transition touch-manipulation",
              orientation === "col" ? "w-full justify-start" : "justify-center",
              active ? "bg-white/10 text-white" : "text-white/60 hover:text-white hover:bg-white/5"
            )}
          >
            <Icon className={clsx("h-4 w-4", active ? "text-[#FFD700]" : "text-white/50")} />
            {item.label}
          </a>
        );
      }
      
      return (
        <Link
          key={item.href}
          href={item.href}
          onClick={() => setMobileOpen(false)}
          className={clsx(
            "flex items-center gap-2 rounded-full px-3 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm transition touch-manipulation",
            orientation === "col" ? "w-full justify-start" : "justify-center",
            active ? "bg-white/10 text-white" : "text-white/60 hover:text-white hover:bg-white/5"
          )}
        >
          <Icon className={clsx("h-4 w-4", active ? "text-[#FFD700]" : "text-white/50")} />
          {item.label}
        </Link>
      );
    });

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-[#050505] to-[#050505] text-white">
      <motion.nav
        initial={{ opacity: 0, y: -10 }}
        animate={isNavHidden ? { y: -80, opacity: 0.98 } : { y: 0, opacity: 1 }}
        transition={{ duration: 0.25, ease: "easeInOut" }}
        className="fixed inset-x-0 top-0 z-40 border-b border-white/5 bg-black/80 backdrop-blur-2xl"
      >
        <div className="mx-auto flex max-w-[1400px] items-center justify-between px-4 sm:px-6 py-3 sm:py-4">
          <Link href="/admin" className="flex items-center gap-2 sm:gap-3 group">
            <div className="relative h-8 w-8 sm:h-10 sm:w-10 transition-transform duration-300 group-hover:scale-110">
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
            <span className="text-xs sm:text-sm md:text-lg font-semibold tracking-[0.25em] sm:tracking-[0.35em] uppercase text-white">
              {safeT(t, 'silverKing', 'Silver King')}
            </span>
          </Link>
          <div className="hidden items-center gap-1.5 sm:gap-2 lg:flex">{renderLinks("row")}</div>
          <div className="flex items-center gap-2 sm:gap-3 text-sm text-white/70">
            <div className="hidden text-right sm:block">
              <p className="text-[10px] sm:text-xs uppercase tracking-[0.25em] sm:tracking-[0.35em] text-white/50">{safeT(t, 'welcome', 'Welcome')}</p>
              <p className="text-xs sm:text-sm font-semibold truncate max-w-[120px] sm:max-w-none">{email}</p>
            </div>
            <div className="hidden sm:block">
              <LanguageSwitcher />
            </div>
            <button
              onClick={handleSignOut}
              className="hidden rounded-full border border-white/15 bg-gradient-to-r from-[#FFD700]/30 to-[#E5C100]/20 px-3 sm:px-4 py-1.5 sm:py-2 text-[10px] sm:text-xs font-semibold text-white transition hover:border-[#FFD700]/50 sm:inline-flex"
            >
              {safeT(t, 'logout', 'Logout')}
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
        <AnimatePresence>
          {mobileOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="border-t border-white/5 bg-black/95 px-4 sm:px-6 pb-4 sm:pb-6 pt-3 sm:pt-4 lg:hidden max-h-[calc(100vh-80px)] overflow-y-auto"
            >
              <div className="flex flex-col gap-2 sm:gap-3">{renderLinks("col")}</div>
              <div className="mt-4 sm:mt-6 rounded-xl sm:rounded-2xl border border-white/10 bg-white/5 p-3 sm:p-4 text-sm text-white/70">
                <p className="text-[10px] sm:text-xs uppercase tracking-[0.25em] sm:tracking-[0.35em] text-white/50">{safeT(t, 'welcome', 'Welcome')}</p>
                <p className="mt-1.5 sm:mt-2 text-sm sm:text-base font-semibold text-white break-words">{email}</p>
                <div className="mt-3 sm:mt-4 mb-3 sm:mb-4">
                  <LanguageSwitcher />
                </div>
                <button
                  onClick={handleSignOut}
                  className="mt-3 sm:mt-4 inline-flex w-full items-center justify-center gap-2 rounded-full border border-white/20 px-4 py-2.5 sm:py-2 text-sm text-white transition hover:border-[#FFD700]/40 touch-manipulation active:scale-95"
                >
                  <LogOut className="h-4 w-4" />
                  {safeT(t, 'logout', 'Logout')}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.nav>

      <main className="mx-auto max-w-[1400px] px-3 sm:px-4 md:px-6 pb-8 sm:pb-10 md:pb-12 pt-16 sm:pt-20 md:pt-24 lg:pt-28">
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
