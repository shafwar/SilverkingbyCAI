"use client";

import { FormEvent, useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";

export function AdminLoginForm() {
  const [email, setEmail] = useState("admin@silverking.com");
  const [password, setPassword] = useState("admin123");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    const res = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });
    setLoading(false);
    if (res?.error) {
      setError("Invalid credentials");
      return;
    }
    router.push("/admin");
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="w-full max-w-md space-y-4 rounded-3xl border border-white/10 bg-black/60 p-8 text-white"
    >
      <div>
        <label className="text-xs uppercase tracking-[0.4em] text-white/40">Email</label>
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="mt-2 w-full rounded-2xl border border-white/15 bg-white/5 px-4 py-3 text-sm"
          type="email"
        />
      </div>
      <div>
        <label className="text-xs uppercase tracking-[0.4em] text-white/40">Password</label>
        <input
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="mt-2 w-full rounded-2xl border border-white/15 bg-white/5 px-4 py-3 text-sm"
          type="password"
        />
      </div>
      {error && <p className="text-xs text-red-400">{error}</p>}
      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-full bg-gradient-to-r from-[#FFD700] to-[#C0C0C0] py-3 text-sm font-semibold tracking-wide text-black"
      >
        {loading ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}

