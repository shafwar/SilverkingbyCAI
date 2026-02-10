import { Resend } from "resend";

// Initialize Resend client
const resend = new Resend(process.env.RESEND_API_KEY);

type SendFeedbackEmailParams = {
  name: string;
  email: string;
  message: string;
  createdAt: Date;
};

/**
 * Send email notification to admin when new feedback is received
 */
export async function sendFeedbackNotificationEmail({
  name,
  email,
  message,
  createdAt,
}: SendFeedbackEmailParams) {
  try {
    const adminEmail = process.env.ADMIN_EMAIL || "";
    const fromEmail = process.env.RESEND_FROM_EMAIL || "";

    if (!fromEmail || !adminEmail) {
      throw new Error("Resend configuration missing. Please set RESEND_FROM_EMAIL and ADMIN_EMAIL in .env");
    }

    if (!process.env.RESEND_API_KEY) {
      throw new Error("RESEND_API_KEY is missing. Please set it in .env");
    }

    // Format date
    const formattedDate = new Date(createdAt).toLocaleString("id-ID", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

    const { data, error } = await resend.emails.send({
      from: `Silver King by CAI <${fromEmail}>`,
      to: [adminEmail],
      subject: `Pesan Baru dari ${name} - Contact Form`,
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Pesan Baru dari Contact Form</title>
          </head>
          <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
            <table role="presentation" style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 40px 20px;">
                  <table role="presentation" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                    <!-- Header -->
                    <tr>
                      <td style="padding: 30px; background: linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%); border-radius: 8px 8px 0 0;">
                        <h1 style="margin: 0; color: #FFD700; font-size: 24px; font-weight: 600;">
                          Silver King by CAI
                        </h1>
                        <p style="margin: 8px 0 0; color: #ffffff; font-size: 14px; opacity: 0.9;">
                          Notifikasi Pesan Baru
                        </p>
                      </td>
                    </tr>
                    
                    <!-- Content -->
                    <tr>
                      <td style="padding: 30px;">
                        <p style="margin: 0 0 20px; color: #333333; font-size: 16px; line-height: 1.6;">
                          Anda menerima pesan baru dari contact form:
                        </p>
                        
                        <!-- Sender Info Card -->
                        <table role="presentation" style="width: 100%; margin-bottom: 20px; background-color: #f9f9f9; border-radius: 6px; border-left: 4px solid #FFD700;">
                          <tr>
                            <td style="padding: 20px;">
                              <p style="margin: 0 0 8px; color: #666666; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600;">
                                Nama
                              </p>
                              <p style="margin: 0; color: #1a1a1a; font-size: 18px; font-weight: 600;">
                                ${name}
                              </p>
                            </td>
                          </tr>
                          <tr>
                            <td style="padding: 0 20px 20px;">
                              <p style="margin: 0 0 8px; color: #666666; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600;">
                                Email
                              </p>
                              <p style="margin: 0;">
                                <a href="mailto:${email}" style="color: #FFD700; text-decoration: none; font-size: 16px; font-weight: 500;">
                                  ${email}
                                </a>
                              </p>
                            </td>
                          </tr>
                          <tr>
                            <td style="padding: 0 20px 20px;">
                              <p style="margin: 0 0 8px; color: #666666; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600;">
                                Tanggal & Waktu
                              </p>
                              <p style="margin: 0; color: #1a1a1a; font-size: 14px;">
                                ${formattedDate}
                              </p>
                            </td>
                          </tr>
                        </table>
                        
                        <!-- Message Content -->
                        <table role="presentation" style="width: 100%; margin-bottom: 30px;">
                          <tr>
                            <td style="padding-bottom: 10px;">
                              <p style="margin: 0; color: #666666; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600;">
                                Pesan
                              </p>
                            </td>
                          </tr>
                          <tr>
                            <td style="padding: 20px; background-color: #f9f9f9; border-radius: 6px; border-left: 4px solid #FFD700;">
                              <p style="margin: 0; color: #1a1a1a; font-size: 15px; line-height: 1.8; white-space: pre-wrap;">
                                ${message.replace(/\n/g, "<br>")}
                              </p>
                            </td>
                          </tr>
                        </table>
                        
                        <!-- Action Button -->
                        <table role="presentation" style="width: 100%;">
                          <tr>
                            <td style="text-align: center; padding-top: 20px;">
                              <a href="${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/admin/feedback" 
                                 style="display: inline-block; padding: 12px 30px; background-color: #FFD700; color: #1a1a1a; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 14px;">
                                Lihat di Admin Panel
                              </a>
                            </td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                    
                    <!-- Footer -->
                    <tr>
                      <td style="padding: 20px 30px; background-color: #f9f9f9; border-radius: 0 0 8px 8px; border-top: 1px solid #e0e0e0;">
                        <p style="margin: 0; color: #999999; font-size: 12px; text-align: center;">
                          Email ini dikirim otomatis dari sistem Silver King by CAI.<br>
                          Jangan balas email ini. Untuk membalas, gunakan tombol "Reply" di admin panel.
                        </p>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          </body>
        </html>
      `,
      text: `
Pesan Baru dari Contact Form

Nama: ${name}
Email: ${email}
Tanggal: ${formattedDate}

Pesan:
${message}

---
Lihat di Admin Panel: ${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/admin/feedback
      `.trim(),
    });

    if (error) {
      console.error("Resend email error:", error);
      throw error;
    }

    console.log("Feedback notification email sent successfully:", data?.id);
    return { success: true, emailId: data?.id };
  } catch (error: any) {
    console.error("Failed to send feedback notification email:", error);
    throw error;
  }
}

/**
 * Send auto-reply email to user who submitted feedback
 */
export async function sendFeedbackAutoReplyEmail({
  name,
  email,
}: {
  name: string;
  email: string;
}) {
  try {
    const fromEmail = process.env.RESEND_FROM_EMAIL || "";

    if (!fromEmail) {
      throw new Error("Resend configuration missing. Please set RESEND_FROM_EMAIL in .env");
    }

    if (!process.env.RESEND_API_KEY) {
      throw new Error("RESEND_API_KEY is missing. Please set it in .env");
    }

    const { data, error } = await resend.emails.send({
      from: `Silver King by CAI <${fromEmail}>`,
      to: [email],
      subject: "Terima Kasih atas Pesan Anda - Silver King by CAI",
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Terima Kasih atas Pesan Anda</title>
          </head>
          <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
            <table role="presentation" style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 40px 20px;">
                  <table role="presentation" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                    <!-- Header -->
                    <tr>
                      <td style="padding: 30px; background: linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%); border-radius: 8px 8px 0 0;">
                        <h1 style="margin: 0; color: #FFD700; font-size: 24px; font-weight: 600;">
                          Silver King by CAI
                        </h1>
                      </td>
                    </tr>
                    
                    <!-- Content -->
                    <tr>
                      <td style="padding: 30px;">
                        <p style="margin: 0 0 20px; color: #333333; font-size: 16px; line-height: 1.6;">
                          Halo <strong>${name}</strong>,
                        </p>
                        
                        <p style="margin: 0 0 20px; color: #333333; font-size: 16px; line-height: 1.6;">
                          Terima kasih telah menghubungi kami melalui contact form. Pesan Anda telah kami terima dan akan segera kami tinjau.
                        </p>
                        
                        <p style="margin: 0 0 20px; color: #333333; font-size: 16px; line-height: 1.6;">
                          Tim kami akan merespons pesan Anda dalam waktu 1-2 hari kerja. Jika Anda memiliki pertanyaan mendesak, silakan hubungi kami langsung.
                        </p>
                        
                        <p style="margin: 0; color: #333333; font-size: 16px; line-height: 1.6;">
                          Salam hangat,<br>
                          <strong>Tim Silver King by CAI</strong>
                        </p>
                      </td>
                    </tr>
                    
                    <!-- Footer -->
                    <tr>
                      <td style="padding: 20px 30px; background-color: #f9f9f9; border-radius: 0 0 8px 8px; border-top: 1px solid #e0e0e0;">
                        <p style="margin: 0; color: #999999; font-size: 12px; text-align: center;">
                          Email ini dikirim otomatis. Jangan balas email ini.
                        </p>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          </body>
        </html>
      `,
      text: `
Terima Kasih atas Pesan Anda - Silver King by CAI

Halo ${name},

Terima Kasih telah menghubungi kami melalui contact form. Pesan Anda telah kami terima dan akan segera kami tinjau.

Tim kami akan merespons pesan Anda dalam waktu 1-2 hari kerja.

Salam hangat,
Tim Silver King by CAI
      `.trim(),
    });

    if (error) {
      console.error("Resend auto-reply email error:", error);
      throw error;
    }

    console.log("Feedback auto-reply email sent successfully:", data?.id);
    return { success: true, emailId: data?.id };
  } catch (error: any) {
    console.error("Failed to send feedback auto-reply email:", error);
    throw error;
  }
}
