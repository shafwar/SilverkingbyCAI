/**
 * POST /api/email
 *
 * Generic transactional email endpoint backed by Resend.
 * Logs every send attempt via the monitoring utility so Resend volume and
 * failures are visible in application logs without a third-party APM.
 *
 * Body (JSON):
 *   to        string | string[]  – recipient address(es)
 *   subject   string             – email subject line
 *   html      string             – HTML body
 *   text?     string             – plain-text fallback (optional)
 *   emailType? string            – label used in monitoring logs (default: "transactional")
 */

import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { logEmailEvent } from "@/utils/monitoring";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { to, subject, html, text, emailType = "transactional" } = body;

    // --- Validation ---
    if (!to || !subject || !html) {
      return NextResponse.json(
        { error: "Missing required fields: to, subject, html" },
        { status: 400 }
      );
    }

    const fromEmail = process.env.RESEND_FROM_EMAIL;
    if (!fromEmail) {
      return NextResponse.json(
        { error: "Server misconfiguration: RESEND_FROM_EMAIL is not set" },
        { status: 500 }
      );
    }

    if (!process.env.RESEND_API_KEY) {
      return NextResponse.json(
        { error: "Server misconfiguration: RESEND_API_KEY is not set" },
        { status: 500 }
      );
    }

    const recipients: string[] = Array.isArray(to) ? to : [to];
    const recipientCount = recipients.length;

    // --- Send ---
    const { data, error } = await resend.emails.send({
      from: `Silver King by CAI <${fromEmail}>`,
      to: recipients,
      subject,
      html,
      ...(text ? { text } : {}),
    });

    if (error) {
      logEmailEvent({
        emailType,
        recipientCount,
        success: false,
        error:
          typeof error === "object" && error !== null && "message" in error
            ? String((error as { message: unknown }).message)
            : String(error),
      });
      console.error("[EMAIL_ROUTE] Resend error:", error);
      return NextResponse.json(
        { error: "Failed to send email", details: error },
        { status: 502 }
      );
    }

    logEmailEvent({
      emailType,
      recipientCount,
      success: true,
      messageId: data?.id,
    });

    return NextResponse.json({ success: true, messageId: data?.id }, { status: 200 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[EMAIL_ROUTE] Unexpected error:", err);
    logEmailEvent({
      emailType: "transactional",
      recipientCount: 0,
      success: false,
      error: message,
    });
    return NextResponse.json(
      { error: "Internal server error", details: message },
      { status: 500 }
    );
  }
}
