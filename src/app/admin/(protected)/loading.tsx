"use client";

import { useTranslations } from "next-intl";

export default function Loading() {
  const t = useTranslations('admin.loading');

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-[#050505] to-[#050505] text-white flex items-center justify-center">
      <div className="text-center space-y-4">
        <div className="w-16 h-16 border-4 border-[#FFD700]/30 border-t-[#FFD700] rounded-full animate-spin mx-auto" />
        <p className="text-white/60 text-sm">{t('dashboard')}</p>
      </div>
    </div>
  );
}

