"use client";

import { FormEvent, useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Eye, EyeOff, ArrowRight } from "lucide-react";

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

  return (
    <form onSubmit={handleSubmit} className="space-y-7">
      {/* Email */}
      <div>
        <label className="block text-[10px] font-semibold uppercase tracking-[0.3em] text-white/30 mb-3">
          {t("email")}
        </label>
        <div className="relative">
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onFocus={() => setFocused("email")}
            onBlur={() => setFocused(null)}
            className="w-full border-0 border-b bg-transparent pb-3 text-[15px] text-white placeholder:text-white/20 outline-none transition-all duration-300"
            style={{
              borderBottomWidth: "1px",
              borderBottomColor:
                focused === "email"
                  ? "rgba(212,175,55,0.6)"
                  : "rgba(255,255,255,0.1)",
            }}
            type="email"
            placeholder="admin@silverking.id"
            autoComplete="email"
            required
          />
          {/* Focus glow line */}
          <div
            className="absolute bottom-0 left-0 right-0 h-px transition-all duration-500"
            style={{
              background:
                focused === "email"
                  ? "linear-gradient(90deg, transparent 0%, rgba(212,175,55,0.6) 50%, transparent 100%)"
                  : "transparent",
              boxShadow:
                focused === "email"
                  ? "0 1px 12px -2px rgba(212,175,55,0.25)"
                  : "none",
            }}
          />
        </div>
      </div>

      {/* Password */}
      <div>
        <label className="block text-[10px] font-semibold uppercase tracking-[0.3em] text-white/30 mb-3">
          {t("password")}
        </label>
        <div className="relative">
          <input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onFocus={() => setFocused("password")}
            onBlur={() => setFocused(null)}
            className="w-full border-0 border-b bg-transparent pb-3 pr-11 text-[15px] text-white placeholder:text-white/20 outline-none transition-all duration-300"
            style={{
              borderBottomWidth: "1px",
              borderBottomColor:
                focused === "password"
                  ? "rgba(212,175,55,0.6)"
                  : "rgba(255,255,255,0.1)",
            }}
            type={showPassword ? "text" : "password"}
            placeholder="Enter your password"
            autoComplete="current-password"
            required
          />
          {/* Focus glow line */}
          <div
            className="absolute bottom-0 left-0 right-0 h-px transition-all duration-500"
            style={{
              background:
                focused === "password"
                  ? "linear-gradient(90deg, transparent 0%, rgba(212,175,55,0.6) 50%, transparent 100%)"
                  : "transparent",
              boxShadow:
                focused === "password"
                  ? "0 1px 12px -2px rgba(212,175,55,0.25)"
                  : "none",
            }}
          />
          <button
            type="button"
            onClick={() => setShowPassword((p) => !p)}
            className="absolute right-0 bottom-2.5 rounded-md p-1 text-white/20 hover:text-luxury-gold/70 transition-colors duration-200"
            aria-label={showPassword ? "Hide password" : "Show password"}
            tabIndex={-1}
          >
            {showPassword ? (
              <EyeOff className="h-4 w-4" />
            ) : (
              <Eye className="h-4 w-4" />
            )}
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-lg border border-red-500/15 bg-red-500/[0.05] px-4 py-3 text-[13px] text-red-400/80">
          {error}
        </div>
      )}

      {/* Submit */}
      <div className="pt-2">
        <button
          type="submit"
          disabled={loading}
          className="group relative w-full overflow-hidden rounded-xl py-4 text-[13px] font-bold tracking-[0.06em] uppercase text-black transition-all duration-400 disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.98]"
          style={{
            background:
              "linear-gradient(135deg, #B8960E 0%, #D4AF37 25%, #FFD700 55%, #E8C84A 80%, #D4AF37 100%)",
            boxShadow: "0 8px 32px -8px rgba(212,175,55,0.3)",
          }}
        >
          {/* Shine sweep */}
          <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/25 to-transparent -translate-x-[200%] group-hover:translate-x-[200%] transition-transform duration-[800ms] ease-out pointer-events-none" />

          <span className="relative z-10 inline-flex items-center justify-center gap-2.5">
            {loading ? (
              <>
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-black/15 border-t-black/60" />
                <span className="normal-case tracking-normal font-semibold">
                  {t("signingIn")}
                </span>
              </>
            ) : (
              <>
                <span>{t("signIn")}</span>
                <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
              </>
            )}
          </span>
        </button>
      </div>
    </form>
  );
}
