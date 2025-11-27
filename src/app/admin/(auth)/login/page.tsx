import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { AdminLoginForm } from "@/components/admin/AdminLoginForm";
import { LoginToaster } from "@/components/admin/LoginToaster";
import { AdminLoginPageClient } from "./AdminLoginPageClient";

export default async function AdminLoginPage() {
  const session = await auth();
  if (session && (session.user as any).role === "ADMIN") {
    redirect("/admin");
  }

  return <AdminLoginPageClient />;
}


