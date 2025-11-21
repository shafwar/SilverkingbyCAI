"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const router = useRouter();

  useEffect(() => {
    // Log error to console for debugging
    console.error("Admin page error:", error);
  }, [error]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-[#050505] to-[#050505] text-white flex items-center justify-center px-4">
      <div className="max-w-md w-full space-y-6 text-center">
        <h2 className="text-2xl font-semibold text-red-400">Something went wrong!</h2>
        <p className="text-white/60">{error.message || "An unexpected error occurred"}</p>
        <div className="flex gap-4 justify-center">
          <button
            onClick={() => reset()}
            className="px-4 py-2 rounded-full border border-white/20 bg-white/5 hover:bg-white/10 transition"
          >
            Try again
          </button>
          <button
            onClick={() => router.push("/admin/login")}
            className="px-4 py-2 rounded-full border border-[#FFD700]/50 bg-[#FFD700]/20 hover:bg-[#FFD700]/30 transition"
          >
            Go to Login
          </button>
        </div>
      </div>
    </div>
  );
}

