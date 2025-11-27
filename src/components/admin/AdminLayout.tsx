"use client";

import { ReactNode, useState, useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import { useTranslations, useLocale } from "next-intl";
import { motion, AnimatePresence } from "framer-motion";
import { Toaster } from "sonner";
import { getR2UrlClient } from "@/utils/r2-url";
import {
  LayoutDashboard,
  PackageSearch,
  QrCode,
  ActivitySquare,
  BarChart3,
  Menu,
  LogOut,
} from "lucide-react";
import clsx from "clsx";
import LanguageSwitcher from "@/components/layout/LanguageSwitcher";

type AdminLayoutProps = {
  children: ReactNode;
  email?: string | null;
};

export function AdminLayout({ children, email }: AdminLayoutProps) {
  const t = useTranslations('admin');
  const tDashboard = useTranslations('admin.dashboard');
  const tExport = useTranslations('admin.export');
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  
  // Memoize navItems untuk memastikan re-render saat locale berubah
  // Include locale in dependency array untuk force re-render saat locale berubah
  const navItems = useMemo(() => [
    { label: tDashboard('label'), href: "/admin", icon: LayoutDashboard },
    { label: t('products'), href: "/admin/products", icon: PackageSearch },
    { label: t('qrPreview'), href: "/admin/qr-preview", icon: QrCode },
    { label: t('logs'), href: "/admin/logs", icon: ActivitySquare },
    { label: t('analyticsLabel'), href: "/admin/analytics", icon: BarChart3 },
  ], [t, locale]);

  const handleSignOut = async () => {
    await signOut({ redirect: false });
    router.push("/admin/login");
  };

  const renderLinks = (orientation: "row" | "col") =>
    navItems.map((item) => {
      const Icon = item.icon;
      const active = pathname === item.href;
      return (
        <Link
          key={item.href}
          href={item.href}
          onClick={() => setMobileOpen(false)}
          className={clsx(
            "flex items-center gap-2 rounded-full px-4 py-2 text-sm transition",
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
        animate={{ opacity: 1, y: 0 }}
        className="fixed inset-x-0 top-0 z-40 border-b border-white/5 bg-black/80 backdrop-blur-2xl"
      >
        <div className="mx-auto flex max-w-[1400px] items-center justify-between px-6 py-4">
          <Link href="/admin" className="flex items-center gap-3 group">
            <div className="relative h-10 w-10 transition-transform duration-300 group-hover:scale-110">
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
            <span className="text-sm md:text-lg font-semibold tracking-[0.35em] uppercase text-white">
              {t('silverKing')}
            </span>
          </Link>
          <div className="hidden items-center gap-2 lg:flex">{renderLinks("row")}</div>
          <div className="flex items-center gap-3 text-sm text-white/70">
            <div className="hidden text-right md:block">
              <p className="text-xs uppercase tracking-[0.35em] text-white/50">{t('welcome')}</p>
              <p className="font-semibold">{email}</p>
            </div>
            <div className="hidden md:block">
              <LanguageSwitcher />
            </div>
            <button
              onClick={handleSignOut}
              className="hidden rounded-full border border-white/15 bg-gradient-to-r from-[#FFD700]/30 to-[#E5C100]/20 px-4 py-2 text-xs font-semibold text-white transition hover:border-[#FFD700]/50 md:inline-flex"
            >
              {t('logout')}
            </button>
            <button
              onClick={() => setMobileOpen((prev) => !prev)}
              className="rounded-full border border-white/15 p-2 text-white lg:hidden"
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
              className="border-t border-white/5 bg-black/95 px-6 pb-6 pt-4 lg:hidden"
            >
              <div className="flex flex-col gap-3">{renderLinks("col")}</div>
              <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-white/70">
                <p className="text-xs uppercase tracking-[0.35em] text-white/50">{t('welcome')}</p>
                <p className="mt-2 font-semibold text-white">{email}</p>
                <div className="mt-4 mb-4">
                  <LanguageSwitcher />
                </div>
                <button
                  onClick={handleSignOut}
                  className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-full border border-white/20 px-4 py-2 text-sm text-white transition hover:border-[#FFD700]/40"
                >
                  <LogOut className="h-4 w-4" />
                  {t('logout')}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.nav>

      <main className="mx-auto max-w-[1400px] px-4 sm:px-6 pb-12 pt-20 sm:pt-24 lg:pt-28">
        {children}
      </main>

      <Toaster
        position="top-right"
        richColors
        closeButton
        toastOptions={{
          className: "toast-minimalist",
          style: {
            background: "rgba(0, 0, 0, 0.9)",
            border: "1px solid rgba(255, 255, 255, 0.1)",
            borderRadius: "12px",
            color: "#fff",
            backdropFilter: "blur(12px)",
          },
          classNames: {
            success: "toast-success",
            error: "toast-error",
            info: "toast-info",
            warning: "toast-warning",
          },
        }}
      />
    </div>
  );
}
