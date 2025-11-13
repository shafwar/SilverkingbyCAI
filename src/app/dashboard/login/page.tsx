"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import Link from "next/link";
import { Shield, Sparkles } from "lucide-react";
import { APP_NAME } from "@/utils/constants";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError(result.error);
      } else {
        router.push("/dashboard");
        router.refresh();
      }
    } catch (error) {
      console.error("Login error:", error);
      setError("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-luxury-black flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          {/* Logo */}
          <Link href="/" className="flex items-center justify-center space-x-2 mb-8">
            <Sparkles className="w-10 h-10 text-luxury-gold" />
            <span className="text-3xl font-serif font-bold text-luxury-gold">{APP_NAME}</span>
          </Link>

          {/* Login Card */}
          <div className="luxury-card">
            <div className="text-center mb-8">
              <Shield className="w-16 h-16 text-luxury-gold mx-auto mb-4" />
              <h1 className="text-3xl font-serif font-bold text-luxury-gold mb-2">Admin Login</h1>
              <p className="text-luxury-silver">Access the Silver King management dashboard</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <div className="bg-red-500/10 border border-red-500 rounded-lg p-4 text-red-500 text-sm">
                  {error}
                </div>
              )}

              <div>
                <label htmlFor="email" className="block text-luxury-silver mb-2">
                  Email Address
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="luxury-input"
                  placeholder="admin@silverking.com"
                  required
                />
              </div>

              <div>
                <label htmlFor="password" className="block text-luxury-silver mb-2">
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="luxury-input"
                  placeholder="••••••••"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full luxury-button disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? "Signing in..." : "Sign In"}
              </button>
            </form>

            <div className="mt-6 text-center">
              <Link
                href="/"
                className="text-luxury-silver hover:text-luxury-gold transition-colors duration-300 text-sm"
              >
                Back to Home
              </Link>
            </div>
          </div>

          <p className="text-center text-luxury-silver/60 text-xs mt-6">
            For demo purposes, use the credentials created during setup
          </p>
        </motion.div>
      </div>
    </div>
  );
}
