"use client";

import { FormEvent, useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Eye, EyeOff, ArrowRight, Mail, Lock } from "lucide-react";

export function AdminLoginForm() {
  const t = useTranslations("admin.login");
  const tCommon = useTranslations("common");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [focused, setFocused] = useState<"email" | "password" | null>(null);
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

  const inputBase =
    "w-full rounded-[10px] border bg-transparent px-4 py-3.5 pl-11 text-[13px] font-light text-white placeholder:text-white/25 outline-none transition-all duration-300";
  const inputIdle = "border-white/[0.08] hover:border-white/[0.14]";
  const inputFocused =
    "border-luxury-gold/40 ring-1 ring-luxury-gold/15 shadow-[0_0_20px_-6px_rgba(212,175,55,0.12)]";

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Email */}
      <div className="space-y-2">
        <label className="text-[10px] font-semibold uppercase tracking-[0.3em] text-white/35">
          {t("email")}
        </label>
        <div className="relative">
          <Mail
            className={`absolute left-3.5 top-1/2 -translate-y-1/2 h-[15px] w-[15px] transition-colors duration-300 ${
              focused === "email" ? "text-luxury-gold/70" : "text-white/20"
            }`}
          />
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onFocus={() => setFocused("email")}
            onBlur={() => setFocused(null)}
            className={`${inputBase} ${focused === "email" ? inputFocused : inputIdle}`}
            type="email"
            placeholder="admin@silverking.id"
            autoComplete="email"
            required
          />
        </div>
      </div>

      {/* Password */}
      <div className="space-y-2">
        <label className="text-[10px] font-semibold uppercase tracking-[0.3em] text-white/35">
          {t("password")}
        </label>
        <div className="relative">
          <Lock
            className={`absolute left-3.5 top-1/2 -translate-y-1/2 h-[15px] w-[15px] transition-colors duration-300 ${
              focused === "password" ? "text-luxury-gold/70" : "text-white/20"
            }`}
          />
          <input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onFocus={() => setFocused("password")}
            onBlur={() => setFocused(null)}
            className={`${inputBase} pr-12 ${focused === "password" ? inputFocused : inputIdle}`}
            type={showPassword ? "text" : "password"}
            placeholder="••••••••"
            autoComplete="current-password"
            required
          />
          <button
            type="button"
            onClick={() => setShowPassword((p) => !p)}
            className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-white/25 hover:text-luxury-gold/80 hover:bg-white/[0.04] transition-all duration-200"
            aria-label={showPassword ? "Hide password" : "Show password"}
            tabIndex={-1}
          >
            {showPassword ? (
              <EyeOff className="h-[15px] w-[15px]" />
            ) : (
              <Eye className="h-[15px] w-[15px]" />
            )}
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-[10px] border border-red-500/20 bg-red-500/[0.06] px-4 py-3 text-[12px] text-red-400/90">
          {error}
        </div>
      )}

      {/* Submit */}
      <div className="pt-1">
        <button
          type="submit"
          disabled={loading}
          className="group relative w-full overflow-hidden rounded-[10px] py-3.5 text-[13px] font-bold tracking-[0.04em] text-black transition-all duration-300 disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.98]"
          style={{
            background:
              "linear-gradient(135deg, #D4AF37 0%, #E8C84A 40%, #FFD700 70%, #D4AF37 100%)",
          }}
        >
          {/* Shine */}
          <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-[200%] group-hover:translate-x-[200%] transition-transform duration-700 pointer-events-none" />

          {/* Hover glow */}
          <span className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" style={{ boxShadow: "0 14px 40px -8px rgba(212,175,55,0.55)" }} />

          <span className="relative z-10 inline-flex items-center justify-center gap-2">
            {loading ? (
              <>
                <span className="h-3.5 w-3.5 animate-spin rounded-full border-[1.5px] border-black/20 border-t-black/70" />
                <span>{t("signingIn")}</span>
              </>
            ) : (
              <>
                <span>{t("signIn")}</span>
                <ArrowRight className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-0.5" />
              </>
            )}
          </span>
        </button>
      </div>
    </form>
  );
}
