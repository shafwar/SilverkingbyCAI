import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, email, message } = body;

    // Validate required fields
    if (!name || !email || !message) {
      return NextResponse.json(
        { error: "Name, email, and message are required" },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: "Invalid email format" },
        { status: 400 }
      );
    }

    // Create feedback
    const feedback = await prisma.feedback.create({
      data: {
        name: name.trim(),
        email: email.trim(),
        message: message.trim(),
      },
    });

    return NextResponse.json(
      { success: true, feedback },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Feedback submission failed:", error);
    return NextResponse.json(
      { error: "Failed to submit feedback", details: error.message },
      { status: 500 }
    );
  }
}
