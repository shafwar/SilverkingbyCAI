import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { AdminLoginPageClient } from "./AdminLoginPageClient";

export default async function AdminLoginPage() {
  const session = await auth();
  if (session && (session.user as { role?: string }).role === "ADMIN") {
    redirect("/admin");
  }

  return <AdminLoginPageClient />;
}
