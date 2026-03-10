"use client";

import { useTranslations } from "next-intl";
import { AdminLoginForm } from "@/components/admin/AdminLoginForm";
import { LoginToaster } from "@/components/admin/LoginToaster";
import { Shield } from "lucide-react";

export function AdminLoginPageClient() {
  const t = useTranslations("admin");

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#050505] px-5 py-12">
      {/* Animated gradient orb */}
      <div
        className="pointer-events-none absolute"
        style={{
          width: "min(700px, 90vw)",
          height: "min(700px, 90vw)",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          background:
            "conic-gradient(from 0deg at 50% 50%, rgba(212,175,55,0.06) 0deg, transparent 60deg, rgba(212,175,55,0.04) 120deg, transparent 180deg, rgba(184,150,14,0.05) 240deg, transparent 300deg, rgba(212,175,55,0.06) 360deg)",
          filter: "blur(80px)",
          animation: "spin-slow 25s linear infinite",
        }}
      />

      {/* Secondary glow */}
      <div
        className="pointer-events-none absolute"
        style={{
          width: "400px",
          height: "400px",
          top: "42%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          background:
            "radial-gradient(circle, rgba(212,175,55,0.08) 0%, transparent 65%)",
          filter: "blur(60px)",
        }}
      />

      {/* Noise */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.02]"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 512 512' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
        }}
      />

      {/* Top accent line */}
      <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-luxury-gold/25 to-transparent" />

      {/* Content */}
      <div className="relative z-10 w-full max-w-[400px]">
        {/* Brand header */}
        <div className="mb-12 text-center">
          {/* Ornamental diamond emblem */}
          <div className="mx-auto mb-7 relative">
            <div
              className="mx-auto h-16 w-16 flex items-center justify-center"
              style={{
                background:
                  "linear-gradient(135deg, rgba(212,175,55,0.15) 0%, rgba(212,175,55,0.05) 100%)",
                clipPath: "polygon(50% 0%, 93% 25%, 93% 75%, 50% 100%, 7% 75%, 7% 25%)",
              }}
            >
              <span
                className="font-serif text-xl font-bold text-luxury-gold"
                style={{ marginTop: "1px" }}
              >
                SK
              </span>
            </div>
            {/* Glow ring */}
            <div
              className="absolute inset-0 mx-auto h-16 w-16 opacity-40 blur-xl"
              style={{
                background: "radial-gradient(circle, rgba(212,175,55,0.3) 0%, transparent 60%)",
              }}
            />
          </div>

          <h1 className="font-serif text-[2rem] font-normal tracking-[0.04em] text-white leading-none">
            {t("adminConsole")}
          </h1>

          <p className="mt-3 text-[10px] font-medium uppercase tracking-[0.45em] text-luxury-gold/40">
            {t("silverKing")}
          </p>

          {/* Ornamental divider */}
          <div className="mt-6 flex items-center justify-center gap-3">
            <div className="h-px w-12 bg-gradient-to-r from-transparent to-white/10" />
            <div className="h-1 w-1 rounded-full bg-luxury-gold/30" />
            <div className="h-px w-12 bg-gradient-to-l from-transparent to-white/10" />
          </div>
        </div>

        {/* Card with gradient border */}
        <div className="relative rounded-2xl p-px" style={{ background: "linear-gradient(180deg, rgba(212,175,55,0.15) 0%, rgba(255,255,255,0.04) 40%, rgba(255,255,255,0.02) 100%)" }}>
          <div className="rounded-2xl bg-[#0a0a0a]/90 backdrop-blur-xl px-8 py-9 sm:px-10">
            <AdminLoginForm />
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 flex items-center justify-center gap-2">
          <Shield className="h-3 w-3 text-white/15" />
          <p className="text-[9px] font-medium uppercase tracking-[0.35em] text-white/15">
            Encrypted &amp; Secured
          </p>
        </div>
      </div>

      {/* Keyframe for spinning orb */}
      <style jsx>{`
        @keyframes spin-slow {
          from { transform: translate(-50%, -50%) rotate(0deg); }
          to { transform: translate(-50%, -50%) rotate(360deg); }
        }
      `}</style>

      <LoginToaster />
    </div>
  );
}
