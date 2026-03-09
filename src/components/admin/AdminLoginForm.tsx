"use client";

import { FormEvent, useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Eye, EyeOff, LogIn, Mail, Lock } from "lucide-react";

export function AdminLoginForm() {
  const t = useTranslations("admin.login");
  const tCommon = useTranslations("common");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });
      if (res?.error) {
        setError(t("invalidCredentialsError"));
        toast.error(t("loginFailed"), {
          description: t("invalidCredentials"),
          duration: 4000,
        });
        return;
      }
      toast.success(t("loginSuccessful"), {
        description: t("welcomeBack"),
        duration: 2000,
      });
      router.push("/admin");
    } catch (error: any) {
      toast.error(t("loginFailed"), {
        description: error.message || tCommon("tryAgain"),
        duration: 4000,
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-md space-y-5">
      {/* Email field */}
      <div className="space-y-2">
        <label className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.25em] text-white/50">
          <Mail className="h-3.5 w-3.5 text-luxury-gold/60" />
          {t("email")}
        </label>
        <div className="group relative">
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-xl border border-white/[0.12] bg-white/[0.04] px-5 py-4 text-sm text-white placeholder:text-white/30 transition-all duration-300 outline-none focus:border-luxury-gold/50 focus:bg-white/[0.06] focus:ring-2 focus:ring-luxury-gold/20 focus:shadow-[0_0_24px_-6px_rgba(212,175,55,0.15)]"
            type="email"
            placeholder="admin@silverking.id"
            autoComplete="email"
            required
          />
          <div className="absolute inset-0 rounded-xl opacity-0 group-focus-within:opacity-100 transition-opacity duration-300 pointer-events-none" style={{ background: "radial-gradient(ellipse 80% 50% at 50% 100%, rgba(212,175,55,0.04) 0%, transparent 60%)" }} />
        </div>
      </div>

      {/* Password field with toggle */}
      <div className="space-y-2">
        <label className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.25em] text-white/50">
          <Lock className="h-3.5 w-3.5 text-luxury-gold/60" />
          {t("password")}
        </label>
        <div className="group relative">
          <input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-xl border border-white/[0.12] bg-white/[0.04] px-5 py-4 pr-14 text-sm text-white placeholder:text-white/30 transition-all duration-300 outline-none focus:border-luxury-gold/50 focus:bg-white/[0.06] focus:ring-2 focus:ring-luxury-gold/20 focus:shadow-[0_0_24px_-6px_rgba(212,175,55,0.15)]"
            type={showPassword ? "text" : "password"}
            placeholder="••••••••"
            autoComplete="current-password"
            required
          />
          <button
            type="button"
            onClick={() => setShowPassword((p) => !p)}
            className="absolute right-4 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-white/40 hover:text-luxury-gold hover:bg-white/[0.06] transition-all duration-200"
            aria-label={showPassword ? "Hide password" : "Show password"}
            tabIndex={-1}
          >
            {showPassword ? <EyeOff className="h-4.5 w-4.5" /> : <Eye className="h-4.5 w-4.5" />}
          </button>
          <div className="absolute inset-0 rounded-xl opacity-0 group-focus-within:opacity-100 transition-opacity duration-300 pointer-events-none" style={{ background: "radial-gradient(ellipse 80% 50% at 50% 100%, rgba(212,175,55,0.04) 0%, transparent 60%)" }} />
        </div>
      </div>

      {/* Error message */}
      {error && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/[0.08] px-4 py-3 text-sm text-red-400 backdrop-blur-sm">
          {error}
        </div>
      )}

      {/* Submit button */}
      <button
        type="submit"
        disabled={loading}
        className="group relative w-full overflow-hidden rounded-xl bg-gradient-to-r from-luxury-gold via-luxury-gold to-luxury-lightGold py-4 text-sm font-bold tracking-wide text-black transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-[0_12px_40px_-10px_rgba(212,175,55,0.5)] active:scale-[0.98]"
      >
        {/* Shine sweep on hover */}
        <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/25 to-transparent translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-700 pointer-events-none" />
        <span className="relative z-10 inline-flex items-center justify-center gap-2.5">
          {loading ? (
            <>
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-black/20 border-t-black" />
              {t("signingIn")}
            </>
          ) : (
            <>
              <LogIn className="h-4 w-4" />
              {t("signIn")}
            </>
          )}
        </span>
      </button>
    </form>
  );
}
