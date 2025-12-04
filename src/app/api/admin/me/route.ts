import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

export async function GET() {
  try {
    const session = await auth();
    const isAdmin = !!session && (session.user as any).role === "ADMIN";
    return NextResponse.json({
      isAdmin,
      email: session?.user?.email ?? null,
    });
  } catch (error) {
    console.error("[ADMIN_ME]", error);
    return NextResponse.json({ isAdmin: false, email: null }, { status: 200 });
  }
}


