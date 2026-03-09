"use client";

import { useTranslations } from "next-intl";
import { AdminLoginForm } from "@/components/admin/AdminLoginForm";
import { LoginToaster } from "@/components/admin/LoginToaster";

export function AdminLoginPageClient() {
  const t = useTranslations("admin");

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-black px-4">
      {/* Layered background effects */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 80% 60% at 50% 0%, rgba(212,175,55,0.12) 0%, transparent 50%), radial-gradient(ellipse 60% 50% at 50% 100%, rgba(192,192,192,0.06) 0%, transparent 40%)",
        }}
      />

      {/* Subtle animated grain texture */}
      <div className="pointer-events-none absolute inset-0 opacity-[0.03]" style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='1'/%3E%3C/svg%3E\")", backgroundRepeat: "repeat" }} />

      {/* Decorative gold border line at top */}
      <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-luxury-gold/40 to-transparent" />

      {/* Main card */}
      <div className="relative z-10 w-full max-w-md">
        {/* Outer glow behind card */}
        <div
          className="absolute -inset-4 rounded-3xl opacity-30 blur-2xl"
          style={{
            background: "radial-gradient(ellipse at 50% 0%, rgba(212,175,55,0.15) 0%, transparent 60%)",
          }}
        />

        <div className="relative rounded-2xl border border-white/[0.08] bg-gradient-to-b from-white/[0.06] to-white/[0.02] p-10 backdrop-blur-md shadow-[0_32px_64px_-16px_rgba(0,0,0,0.7)]">
          {/* Gold accent line at top of card */}
          <div className="absolute top-0 left-8 right-8 h-[1px] bg-gradient-to-r from-transparent via-luxury-gold/50 to-transparent" />

          {/* Logo / Brand section */}
          <div className="mb-8 text-center">
            {/* Crown-like ornament */}
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-luxury-gold/20 bg-gradient-to-b from-luxury-gold/10 to-transparent shadow-[0_0_24px_-4px_rgba(212,175,55,0.15)]">
              <span className="text-2xl font-serif font-bold text-luxury-gold">S</span>
            </div>
            <p className="text-[10px] font-medium uppercase tracking-[0.5em] text-luxury-gold/60">
              {t("silverKing")}
            </p>
            <h1 className="mt-2 text-2xl font-serif font-semibold tracking-wide text-white">
              {t("adminConsole")}
            </h1>
            <div className="mx-auto mt-3 h-[1px] w-16 bg-gradient-to-r from-transparent via-white/20 to-transparent" />
          </div>

          {/* Form */}
          <AdminLoginForm />

          {/* Subtle footer */}
          <div className="mt-6 text-center">
            <p className="text-[10px] uppercase tracking-[0.3em] text-white/20">
              Secured Access
            </p>
          </div>
        </div>
      </div>

      <LoginToaster />
    </div>
  );
}
