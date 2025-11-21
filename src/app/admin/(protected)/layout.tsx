import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { AdminLayout } from "@/components/admin/AdminLayout";

export default async function ProtectedAdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  try {
    const session = await auth();

    if (!session || (session.user as any).role !== "ADMIN") {
      redirect("/admin/login");
    }

    return <AdminLayout email={session.user?.email}>{children}</AdminLayout>;
  } catch (error) {
    console.error("Auth error in protected layout:", error);
    redirect("/admin/login");
  }
}

