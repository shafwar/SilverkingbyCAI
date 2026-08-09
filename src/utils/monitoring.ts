/**
 * Lightweight monitoring utilities for external service usage.
 *
 * Logs structured events for R2 (Cloudflare) and Resend so cost spikes can be
 * identified quickly in log aggregators without requiring a third-party APM.
 *
 * All functions are fire-and-forget — they never throw and never block the
 * caller's critical path.
 */

export type R2Operation = "upload" | "download" | "delete" | "list";

export interface R2Event {
  operation: R2Operation;
  /** Object key / path inside the bucket */
  key: string;
  /** File size in bytes (required for upload/download, optional otherwise) */
  sizeBytes?: number;
  /** MIME type of the object */
  contentType?: string;
  /** Wall-clock duration of the operation in milliseconds */
  durationMs?: number;
  /** Whether the operation succeeded */
  success: boolean;
  /** Error message if the operation failed */
  error?: string;
}

export interface EmailEvent {
  /** Logical name for the email type, e.g. "feedback-notification" */
  emailType: string;
  /** Number of recipient addresses in the `to` field */
  recipientCount: number;
  /** Whether the send call succeeded */
  success: boolean;
  /** Resend message ID returned on success */
  messageId?: string;
  /** Error message if the send failed */
  error?: string;
}

/**
 * Log an R2 storage operation.
 *
 * @example
 * logR2Event({ operation: "upload", key: "static/images/foo.jpg", sizeBytes: 204800, contentType: "image/jpeg", success: true });
 */
export function logR2Event(event: R2Event): void {
  try {
    const sizeKb =
      event.sizeBytes != null ? `${(event.sizeBytes / 1024).toFixed(1)} KB` : "unknown size";
    const duration =
      event.durationMs != null ? ` in ${event.durationMs}ms` : "";
    const status = event.success ? "OK" : `FAILED (${event.error ?? "unknown error"})`;

    console.log(
      `[R2_MONITOR] op=${event.operation} key="${event.key}" size=${sizeKb}` +
        (event.contentType ? ` type=${event.contentType}` : "") +
        `${duration} status=${status}`
    );
  } catch {
    // Never let monitoring break the caller
  }
}

/**
 * Log a Resend email send event.
 *
 * @example
 * logEmailEvent({ emailType: "feedback-notification", recipientCount: 1, success: true, messageId: "abc123" });
 */
export function logEmailEvent(event: EmailEvent): void {
  try {
    const status = event.success
      ? `OK (id=${event.messageId ?? "n/a"})`
      : `FAILED (${event.error ?? "unknown error"})`;

    console.log(
      `[RESEND_MONITOR] type=${event.emailType} recipients=${event.recipientCount} status=${status}`
    );
  } catch {
    // Never let monitoring break the caller
  }
}
