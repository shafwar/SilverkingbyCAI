"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import { useTranslations, useLocale } from "next-intl";
import { useMemo } from "react";
import { motion } from "framer-motion";

export function AdminNav({ email }: { email?: string | null }) {
  const t = useTranslations('admin');
  const tDashboard = useTranslations('admin.dashboard');
  const tExport = useTranslations('admin.export');
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();

  const navLinks = useMemo(() => [
    { label: tDashboard('label'), href: "/admin" },
    { label: t('products'), href: "/admin/products" },
    { label: t('qrPreview'), href: "/admin/qr-preview" },
    { label: t('logs'), href: "/admin/logs" },
    { label: tExport('label'), href: "/admin/export" },
  ], [t, tDashboard, tExport, locale]);

  const handleSignOut = async () => {
    await signOut({ redirect: false });
    router.push("/admin/login");
  };

  return (
    <motion.nav
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="fixed inset-x-0 top-0 z-40 bg-black/80 backdrop-blur-xl border-b border-white/5"
    >
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4 text-sm text-white">
        <Link href="/admin" className="font-semibold tracking-[0.3em] uppercase text-xs text-white/70">
          {t('silverKingAdmin')}
        </Link>
        <div className="hidden md:flex items-center gap-6">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`text-xs tracking-wide transition ${
                pathname === link.href ? "text-white" : "text-white/50 hover:text-white/80"
              }`}
            >
              {link.label}
            </Link>
          ))}
        </div>
        <div className="flex items-center gap-3">
          <span className="hidden text-xs text-white/50 md:inline">{email}</span>
          <button
            onClick={handleSignOut}
            className="rounded-full border border-white/20 px-3 py-1 text-xs text-white/80 transition hover:border-white/50"
          >
            {t('signOut')}
          </button>
        </div>
      </div>
    </motion.nav>
  );
}

