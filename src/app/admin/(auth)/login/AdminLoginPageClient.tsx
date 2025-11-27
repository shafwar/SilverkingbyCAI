"use client";

import { useTranslations } from "next-intl";
import { AdminLoginForm } from "@/components/admin/AdminLoginForm";
import { LoginToaster } from "@/components/admin/LoginToaster";

export function AdminLoginPageClient() {
  const t = useTranslations('admin');

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-gradient-to-b from-black via-[#050505] to-black px-4">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(255,215,0,0.15),_transparent_50%)]" />
      <div className="relative z-10 text-center space-y-6">
        <div>
          <p className="text-xs uppercase tracking-[0.6em] text-white/40">{t('silverKing')}</p>
          <h1 className="text-3xl font-semibold text-white">{t('adminConsole')}</h1>
        </div>
        <AdminLoginForm />
      </div>
      <LoginToaster />
    </div>
  );
}

