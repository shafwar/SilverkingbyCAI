"use client";

import { useTranslations } from "next-intl";
import { AdminLoginForm } from "@/components/admin/AdminLoginForm";
import { LoginToaster } from "@/components/admin/LoginToaster";

export function AdminLoginPageClient() {
  const t = useTranslations("admin");

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#060606] px-5">
      {/* Background layers */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background: [
            "radial-gradient(ellipse 70% 50% at 50% -5%, rgba(212,175,55,0.10) 0%, transparent 55%)",
            "radial-gradient(ellipse 50% 40% at 50% 105%, rgba(192,192,192,0.04) 0%, transparent 45%)",
            "radial-gradient(ellipse 40% 35% at 20% 50%, rgba(212,175,55,0.03) 0%, transparent 50%)",
            "radial-gradient(ellipse 40% 35% at 80% 50%, rgba(212,175,55,0.03) 0%, transparent 50%)",
          ].join(", "),
        }}
      />

      {/* Noise texture */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.025]"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 512 512' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
          backgroundRepeat: "repeat",
        }}
      />

      {/* Top gold accent */}
      <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-luxury-gold/30 to-transparent" />

      {/* Card container */}
      <div className="relative z-10 w-full max-w-[420px]">
        {/* Card glow */}
        <div
          className="absolute -inset-6 rounded-[28px] opacity-25 blur-3xl"
          style={{
            background:
              "radial-gradient(ellipse at 50% 0%, rgba(212,175,55,0.12) 0%, transparent 65%)",
          }}
        />

        {/* Glass card */}
        <div className="relative overflow-hidden rounded-2xl border border-white/[0.07] bg-white/[0.03] shadow-[0_40px_80px_-20px_rgba(0,0,0,0.8)]">
          {/* Top gold hairline */}
          <div className="absolute top-0 inset-x-6 h-px bg-gradient-to-r from-transparent via-luxury-gold/40 to-transparent" />

          {/* Inner glass gradient */}
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                "linear-gradient(180deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.01) 40%, rgba(0,0,0,0) 100%)",
            }}
          />

          <div className="relative px-10 pt-12 pb-10 sm:px-12">
            {/* Brand */}
            <div className="mb-10 text-center">
              {/* Monogram */}
              <div className="mx-auto mb-5 flex h-[52px] w-[52px] items-center justify-center rounded-[14px] border border-luxury-gold/25 bg-gradient-to-b from-luxury-gold/[0.12] to-luxury-gold/[0.03]">
                <span className="font-serif text-[22px] font-bold leading-none text-luxury-gold">
                  S
                </span>
              </div>

              <p className="text-[9px] font-semibold uppercase tracking-[0.55em] text-luxury-gold/50">
                {t("silverKing")}
              </p>

              <h1 className="mt-2.5 font-serif text-[1.55rem] font-semibold tracking-[0.02em] text-white">
                {t("adminConsole")}
              </h1>

              <div className="mx-auto mt-4 h-px w-10 bg-gradient-to-r from-transparent via-white/15 to-transparent" />
            </div>

            {/* Form */}
            <AdminLoginForm />

            {/* Footer mark */}
            <div className="mt-8 flex items-center justify-center gap-2.5">
              <div className="h-px w-6 bg-gradient-to-r from-transparent to-white/10" />
              <p className="text-[8px] font-semibold uppercase tracking-[0.4em] text-white/15">
                Secured Access
              </p>
              <div className="h-px w-6 bg-gradient-to-l from-transparent to-white/10" />
            </div>
          </div>
        </div>
      </div>

      <LoginToaster />
    </div>
  );
}
