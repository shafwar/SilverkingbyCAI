"use client";

import { useTranslations } from "next-intl";
import Image from "next/image";
import { Outfit } from "next/font/google";
import { AdminLoginForm } from "@/components/admin/AdminLoginForm";
import { LoginToaster } from "@/components/admin/LoginToaster";
import { getR2UrlClient } from "@/utils/r2-url";
import { Shield } from "lucide-react";

const adminTitle = Outfit({
  subsets: ["latin"],
  weight: ["700", "800"],
  display: "swap",
});

const LOGO_SRC = getR2UrlClient("/images/cai-logo.png");

export function AdminLoginPageClient() {
  const t = useTranslations("admin");

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#030303] px-5 py-12">
      {/* Base vignette */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 85% 70% at 50% 32%, rgba(212,175,55,0.055) 0%, transparent 52%), radial-gradient(ellipse 100% 78% at 50% 100%, rgba(0,0,0,0.55) 0%, transparent 48%)",
        }}
      />

      {/* Animated gradient orb */}
      <div
        className="pointer-events-none absolute"
        style={{
          width: "min(720px, 92vw)",
          height: "min(720px, 92vw)",
          top: "46%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          background:
            "conic-gradient(from 0deg at 50% 50%, rgba(212,175,55,0.06) 0deg, transparent 55deg, rgba(212,175,55,0.028) 115deg, transparent 185deg, rgba(184,150,14,0.04) 245deg, transparent 305deg, rgba(212,175,55,0.05) 360deg)",
          filter: "blur(88px)",
          animation: "spin-slow 28s linear infinite",
        }}
      />

      <div
        className="pointer-events-none absolute"
        style={{
          width: "min(380px, 72vw)",
          height: "min(380px, 72vw)",
          top: "42%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          background: "radial-gradient(circle, rgba(212,175,55,0.1) 0%, transparent 62%)",
          filter: "blur(64px)",
        }}
      />

      <div
        className="pointer-events-none absolute inset-0 opacity-[0.022]"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 512 512' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
        }}
      />

      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-luxury-gold/28 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-white/[0.06] to-transparent" />

      <div className="relative z-10 w-full max-w-[420px]">
        <div className="mb-10 text-center sm:mb-11">
          {/* Same brand mark as site header (cai-logo.png) */}
          <div className="relative mx-auto mb-8 flex h-[5.25rem] w-[5.25rem] items-center justify-center sm:h-[5.75rem] sm:w-[5.75rem]">
            <div
              className="absolute inset-0 rounded-[1.35rem] opacity-60 blur-2xl"
              style={{
                background: "radial-gradient(circle at 50% 50%, rgba(212,175,55,0.35) 0%, transparent 68%)",
              }}
            />
            <div
              className="relative flex h-full w-full items-center justify-center rounded-[1.25rem] border border-white/[0.12] bg-gradient-to-b from-white/[0.06] to-white/[0.02] p-3 shadow-[0_20px_50px_-20px_rgba(0,0,0,0.85),inset_0_1px_0_rgba(255,255,255,0.08)]"
              style={{ backdropFilter: "blur(12px)" }}
            >
              <div className="relative h-full w-full">
                <Image
                  src={LOGO_SRC}
                  alt="Silver King by CAI"
                  fill
                  sizes="(max-width: 640px) 84px, 92px"
                  className="object-contain"
                  style={{
                    filter:
                      "brightness(0) invert(1) contrast(1.08) drop-shadow(0 0 14px rgba(255, 255, 255, 0.18))",
                  }}
                  priority
                />
              </div>
            </div>
          </div>

          <h1
            className={`${adminTitle.className} text-[1.75rem] font-extrabold leading-[1.12] tracking-[-0.03em] text-white sm:text-[2.125rem]`}
          >
            {t("adminConsole")}
          </h1>

          <p className="mt-3 text-[10px] font-semibold uppercase tracking-[0.42em] text-luxury-gold/55">
            {t("silverKing")}
          </p>

          <div className="mt-7 flex items-center justify-center gap-3">
            <div className="h-px w-14 bg-gradient-to-r from-transparent to-white/12" />
            <div className="h-1 w-1 rotate-45 border border-luxury-gold/45 bg-luxury-gold/15" />
            <div className="h-px w-14 bg-gradient-to-l from-transparent to-white/12" />
          </div>
        </div>

        <div
          className="relative rounded-2xl p-px shadow-[0_28px_90px_-28px_rgba(0,0,0,0.9)]"
          style={{
            background:
              "linear-gradient(165deg, rgba(212,175,55,0.24) 0%, rgba(255,255,255,0.07) 40%, rgba(255,255,255,0.04) 100%)",
          }}
        >
          <div
            className="rounded-2xl px-8 py-10 sm:px-10"
            style={{
              background:
                "linear-gradient(180deg, rgba(14,14,16,0.96) 0%, rgba(7,7,9,0.99) 100%)",
              backdropFilter: "blur(22px)",
            }}
          >
            <AdminLoginForm />
          </div>
        </div>

        <div className="mt-9 flex items-center justify-center gap-2 text-zinc-600">
          <Shield className="h-3.5 w-3.5 text-luxury-gold/30" strokeWidth={1.75} />
          <p className="text-[9px] font-semibold uppercase tracking-[0.32em] text-zinc-500">
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
