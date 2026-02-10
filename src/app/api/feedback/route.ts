import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendFeedbackNotificationEmail, sendFeedbackAutoReplyEmail } from "@/lib/email";

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

    // Send email notifications (non-blocking - don't fail if email fails)
    try {
      // Send notification to admin
      await sendFeedbackNotificationEmail({
        name: feedback.name,
        email: feedback.email,
        message: feedback.message,
        createdAt: feedback.createdAt,
      });

      // Send auto-reply to user
      await sendFeedbackAutoReplyEmail({
        name: feedback.name,
        email: feedback.email,
      });
    } catch (emailError: any) {
      // Log email error but don't fail the request
      console.error("Email sending failed (non-critical):", emailError);
      // Continue - feedback is still saved successfully
    }

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
