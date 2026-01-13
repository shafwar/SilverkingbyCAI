import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session || (session.user as any).role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = Number(searchParams.get("page") ?? 1);
    const pageSize = Number(searchParams.get("pageSize") ?? 20);
    const query = searchParams.get("q");
    const readFilter = searchParams.get("read");

    const where: any = {};

    if (query) {
      where.OR = [
        { name: { contains: query, mode: "insensitive" } },
        { email: { contains: query, mode: "insensitive" } },
        { message: { contains: query, mode: "insensitive" } },
      ];
    }

    if (readFilter !== null && readFilter !== undefined) {
      where.read = readFilter === "true";
    }

    const skip = (page - 1) * pageSize;
    const take = pageSize;

    const [feedbacks, total] = await Promise.all([
      prisma.feedback.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take,
      }),
      prisma.feedback.count({ where }),
    ]);

    const totalPages = Math.ceil(total / pageSize);

    return NextResponse.json({
      feedbacks: feedbacks.map((f) => ({
        id: f.id,
        name: f.name,
        email: f.email,
        message: f.message,
        createdAt: f.createdAt.toISOString(),
        read: f.read,
      })),
      meta: {
        page,
        totalPages,
        total,
      },
    });
  } catch (error) {
    console.error("Error fetching feedback:", error);
    return NextResponse.json({ error: "Failed to fetch feedback" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await auth();
    if (!session || (session.user as any).role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { id, read } = body;

    if (typeof id !== "number" || typeof read !== "boolean") {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }

    const feedback = await prisma.feedback.update({
      where: { id },
      data: { read },
    });

    return NextResponse.json({ feedback });
  } catch (error) {
    console.error("Error updating feedback:", error);
    return NextResponse.json({ error: "Failed to update feedback" }, { status: 500 });
  }
}
