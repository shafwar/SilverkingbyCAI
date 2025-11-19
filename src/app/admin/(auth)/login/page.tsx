import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { AdminLoginForm } from "@/components/admin/AdminLoginForm";
import { LoginToaster } from "@/components/admin/LoginToaster";

export default async function AdminLoginPage() {
  const session = await auth();
  if (session && (session.user as any).role === "ADMIN") {
    redirect("/admin");
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-gradient-to-b from-black via-[#050505] to-black px-4">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(255,215,0,0.15),_transparent_50%)]" />
      <div className="relative z-10 text-center space-y-6">
        <div>
          <p className="text-xs uppercase tracking-[0.6em] text-white/40">Silver King</p>
          <h1 className="text-3xl font-semibold text-white">Admin Console</h1>
        </div>
        <AdminLoginForm />
      </div>
      <LoginToaster />
    </div>
  );
}

