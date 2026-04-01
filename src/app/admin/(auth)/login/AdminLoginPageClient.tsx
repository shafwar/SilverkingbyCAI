"use client";

import { useTranslations } from "next-intl";
import { Outfit } from "next/font/google";
import { AdminLoginForm } from "@/components/admin/AdminLoginForm";
import { LoginToaster } from "@/components/admin/LoginToaster";
import { Shield } from "lucide-react";

const adminTitle = Outfit({
  subsets: ["latin"],
  weight: ["700", "800"],
  display: "swap",
});

export function AdminLoginPageClient() {
  const t = useTranslations("admin");

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#030303] px-5 py-12">
      {/* Base vignette */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 85% 70% at 50% 35%, rgba(212,175,55,0.045) 0%, transparent 55%), radial-gradient(ellipse 100% 80% at 50% 100%, rgba(0,0,0,0.5) 0%, transparent 45%)",
        }}
      />

      {/* Animated gradient orb */}
      <div
        className="pointer-events-none absolute"
        style={{
          width: "min(720px, 92vw)",
          height: "min(720px, 92vw)",
          top: "48%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          background:
            "conic-gradient(from 0deg at 50% 50%, rgba(212,175,55,0.07) 0deg, transparent 55deg, rgba(212,175,55,0.035) 115deg, transparent 185deg, rgba(184,150,14,0.05) 245deg, transparent 305deg, rgba(212,175,55,0.06) 360deg)",
          filter: "blur(88px)",
          animation: "spin-slow 28s linear infinite",
        }}
      />

      <div
        className="pointer-events-none absolute"
        style={{
          width: "min(420px, 70vw)",
          height: "min(420px, 70vw)",
          top: "44%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          background: "radial-gradient(circle, rgba(212,175,55,0.09) 0%, transparent 62%)",
          filter: "blur(64px)",
        }}
      />

      <div
        className="pointer-events-none absolute inset-0 opacity-[0.025]"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 512 512' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
        }}
      />

      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-luxury-gold/30 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-white/[0.06] to-transparent" />

      <div className="relative z-10 w-full max-w-[420px]">
        <div className="mb-10 text-center sm:mb-11">
          <div className="relative mx-auto mb-8 h-[4.5rem] w-[4.5rem]">
            <div
              className="relative z-10 flex h-full w-full items-center justify-center"
              style={{
                background:
                  "linear-gradient(145deg, rgba(212,175,55,0.22) 0%, rgba(212,175,55,0.06) 50%, rgba(184,150,14,0.12) 100%)",
                clipPath: "polygon(50% 0%, 93% 25%, 93% 75%, 50% 100%, 7% 75%, 7% 25%)",
                boxShadow: "inset 0 1px 0 rgba(255,255,255,0.12), 0 12px 40px -12px rgba(212,175,55,0.35)",
              }}
            >
              <span className="font-serif text-[1.35rem] font-bold tracking-tight text-luxury-gold">SK</span>
            </div>
            <div
              className="absolute inset-0 -m-1 opacity-50 blur-2xl"
              style={{
                background: "radial-gradient(circle, rgba(212,175,55,0.35) 0%, transparent 65%)",
              }}
            />
          </div>

          <h1
            className={`${adminTitle.className} text-[1.625rem] font-extrabold leading-[1.15] tracking-[-0.03em] text-white sm:text-[2rem]`}
          >
            {t("adminConsole")}
          </h1>

          <p className="mt-3 text-[10px] font-semibold uppercase tracking-[0.42em] text-luxury-gold/55">
            {t("silverKing")}
          </p>

          <div className="mt-7 flex items-center justify-center gap-3">
            <div className="h-px w-14 bg-gradient-to-r from-transparent to-white/12" />
            <div className="h-1 w-1 rotate-45 border border-luxury-gold/40 bg-luxury-gold/10" />
            <div className="h-px w-14 bg-gradient-to-l from-transparent to-white/12" />
          </div>
        </div>

        <div
          className="relative rounded-2xl p-px shadow-[0_24px_80px_-24px_rgba(0,0,0,0.85)]"
          style={{
            background:
              "linear-gradient(165deg, rgba(212,175,55,0.22) 0%, rgba(255,255,255,0.06) 38%, rgba(255,255,255,0.03) 100%)",
          }}
        >
          <div
            className="rounded-2xl px-8 py-10 sm:px-10"
            style={{
              background:
                "linear-gradient(180deg, rgba(14,14,16,0.94) 0%, rgba(8,8,10,0.97) 100%)",
              backdropFilter: "blur(20px)",
            }}
          >
            <AdminLoginForm />
          </div>
        </div>

        <div className="mt-9 flex items-center justify-center gap-2 text-zinc-600">
          <Shield className="h-3.5 w-3.5 text-luxury-gold/25" strokeWidth={1.75} />
          <p className="text-[9px] font-semibold uppercase tracking-[0.32em] text-zinc-600">
            Encrypted &amp; Secured
          </p>
        </div>
      </div>

      <style jsx>{`
        @keyframes spin-slow {
          from {
            transform: translate(-50%, -50%) rotate(0deg);
          }
          to {
            transform: translate(-50%, -50%) rotate(360deg);
          }
        }
      `}</style>

      <LoginToaster />
    </div>
  );
}
