"use client";

import { FormEvent, useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Eye, EyeOff, ArrowRight, Mail, Lock } from "lucide-react";

const fieldBase =
  "admin-login-field w-full rounded-xl border bg-[#0c0c0e]/95 px-4 py-3.5 pl-11 text-[15px] text-zinc-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] transition-[border-color,box-shadow] duration-200 placeholder:text-zinc-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-luxury-gold/20";

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
    } catch (error: unknown) {
      toast.error(t("loginFailed"), {
        description: error instanceof Error ? error.message : tCommon("tryAgain"),
        duration: 4000,
      });
    } finally {
      setLoading(false);
    }
  }

  const emailBorder =
    focused === "email"
      ? "border-luxury-gold/45 ring-1 ring-luxury-gold/25"
      : "border-white/[0.1] hover:border-white/[0.14]";
  const passwordBorder =
    focused === "password"
      ? "border-luxury-gold/45 ring-1 ring-luxury-gold/25"
      : "border-white/[0.1] hover:border-white/[0.14]";

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label
          htmlFor="admin-login-email"
          className="mb-2.5 block text-[10px] font-semibold uppercase tracking-[0.28em] text-zinc-500"
        >
          {t("email")}
        </label>
        <div className="relative">
          <Mail
            className="pointer-events-none absolute left-3.5 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-zinc-600"
            aria-hidden
          />
          <input
            id="admin-login-email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onFocus={() => setFocused("email")}
            onBlur={() => setFocused(null)}
            className={`${fieldBase} ${emailBorder} pr-4`}
            type="email"
            placeholder="admin@silverking.id"
            autoComplete="email"
            required
          />
        </div>
      </div>

      <div>
        <label
          htmlFor="admin-login-password"
          className="mb-2.5 block text-[10px] font-semibold uppercase tracking-[0.28em] text-zinc-500"
        >
          {t("password")}
        </label>
        <div className="relative">
          <Lock
            className="pointer-events-none absolute left-3.5 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-zinc-600"
            aria-hidden
          />
          <input
            id="admin-login-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onFocus={() => setFocused("password")}
            onBlur={() => setFocused(null)}
            className={`${fieldBase} ${passwordBorder} pr-12`}
            type={showPassword ? "text" : "password"}
            placeholder="••••••••"
            autoComplete="current-password"
            required
          />
          <button
            type="button"
            onClick={() => setShowPassword((p) => !p)}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-2 text-zinc-500 transition-colors hover:bg-white/[0.06] hover:text-luxury-gold/90"
            aria-label={showPassword ? "Hide password" : "Show password"}
            tabIndex={-1}
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {error && (
        <div
          role="alert"
          className="rounded-xl border border-red-500/20 bg-red-950/30 px-4 py-3 text-[13px] leading-relaxed text-red-300/90 backdrop-blur-sm"
        >
          {error}
        </div>
      )}

      <div className="pt-1">
        <button
          type="submit"
          disabled={loading}
          className="group relative w-full overflow-hidden rounded-xl border border-luxury-gold/25 bg-gradient-to-b from-[#e8c547] via-[#d4af37] to-[#b8960e] py-3.5 text-[12px] font-extrabold uppercase tracking-[0.12em] text-[#0a0a0a] shadow-[0_8px_28px_-6px_rgba(212,175,55,0.45)] transition-[transform,box-shadow,opacity] duration-200 hover:shadow-[0_12px_36px_-8px_rgba(212,175,55,0.5)] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-45"
        >
          <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
          <span className="absolute inset-0 translate-x-[-120%] bg-gradient-to-r from-transparent via-white/20 to-transparent transition-transform duration-700 ease-out group-hover:translate-x-[120%]" />

          <span className="relative z-10 inline-flex w-full items-center justify-center gap-2.5">
            {loading ? (
              <>
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-black/20 border-t-black/70" />
                <span className="normal-case tracking-normal font-bold">{t("signingIn")}</span>
              </>
            ) : (
              <>
                <span>{t("signIn")}</span>
                <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5" />
              </>
            )}
          </span>
        </button>
      </div>
    </form>
  );
}
