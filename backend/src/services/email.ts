import nodemailer from "nodemailer";
import { logSystemEvent } from "./db.js";

const SMTP_HOST = process.env.SMTP_HOST || "smtp.gmail.com";
const SMTP_PORT = Number(process.env.SMTP_PORT) || 587;
const SMTP_USER = process.env.SMTP_USER || "";
const SMTP_PASS = process.env.SMTP_PASS || "";
const SMTP_FROM = process.env.SMTP_FROM || SMTP_USER || "noreply@cardiomate.ai";
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";

// Create reusable transporter
const transporter = nodemailer.createTransport({
  host: SMTP_HOST,
  port: SMTP_PORT,
  secure: SMTP_PORT === 465, // true for 465, false for other ports
  auth: SMTP_USER && SMTP_PASS ? {
    user: SMTP_USER,
    pass: SMTP_PASS,
  } : undefined,
});

// Verify transporter configuration
if (SMTP_USER && SMTP_PASS) {
  transporter.verify().then(() => {
    console.log("✅ Email service configured and ready");
  }).catch((error) => {
    console.warn("⚠️ Email service configuration issue:", error.message);
    console.warn("⚠️ Password reset emails will not be sent. Set SMTP_USER and SMTP_PASS in .env");
  });
} else {
  console.warn("⚠️ SMTP credentials not configured. Password reset emails will not be sent.");
  console.warn("⚠️ Set SMTP_USER and SMTP_PASS in .env to enable email functionality");
}

export async function sendPasswordResetEmail(
  email: string,
  resetToken: string,
  userName?: string
): Promise<void> {
  if (!SMTP_USER || !SMTP_PASS) {
    // In development, log the reset link instead of sending email
    console.log("\n📧 Password Reset Email (Development Mode)");
    console.log("═══════════════════════════════════════════════════════════");
    console.log(`To: ${email}`);
    console.log(`Subject: Reset Your CardioMate AI Password`);
    console.log(`\nReset Link: ${FRONTEND_URL}/reset-password?token=${resetToken}`);
    console.log("═══════════════════════════════════════════════════════════\n");
    return;
  }

  const resetUrl = `${FRONTEND_URL}/reset-password?token=${resetToken}`;

  const mailOptions = {
    from: `"CardioMate AI" <${SMTP_FROM}>`,
    to: email,
    subject: "Reset Your CardioMate AI Password",
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6;
            color: #1e293b;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
          }
          .header {
            background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%);
            color: white;
            padding: 30px;
            text-align: center;
            border-radius: 12px 12px 0 0;
          }
          .header h1 {
            margin: 0;
            font-size: 24px;
            font-weight: 700;
          }
          .content {
            background: #ffffff;
            padding: 30px;
            border: 1px solid #e2e8f0;
            border-top: none;
            border-radius: 0 0 12px 12px;
          }
          .button {
            display: inline-block;
            padding: 14px 28px;
            background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%);
            color: white;
            text-decoration: none;
            border-radius: 8px;
            font-weight: 600;
            margin: 20px 0;
            box-shadow: 0 4px 12px rgba(220, 38, 38, 0.3);
          }
          .button:hover {
            background: linear-gradient(135deg, #b91c1c 0%, #991b1b 100%);
          }
          .footer {
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #e2e8f0;
            font-size: 12px;
            color: #64748b;
            text-align: center;
          }
          .warning {
            background: #fef2f2;
            border-left: 4px solid #dc2626;
            padding: 12px;
            margin: 20px 0;
            border-radius: 4px;
            font-size: 14px;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>CardioMate AI</h1>
        </div>
        <div class="content">
          <h2 style="color: #1e293b; margin-top: 0;">Password Reset Request</h2>
          <p>Hello${userName ? ` ${userName}` : ""},</p>
          <p>We received a request to reset your password for your CardioMate AI account. Click the button below to create a new password:</p>
          
          <div style="text-align: center;">
            <a href="${resetUrl}" class="button">Reset Password</a>
          </div>
          
          <p style="font-size: 14px; color: #64748b;">Or copy and paste this link into your browser:</p>
          <p style="font-size: 12px; color: #64748b; word-break: break-all;">${resetUrl}</p>
          
          <div class="warning">
            <strong>⚠️ Security Notice:</strong> This link will expire in 1 hour. If you didn't request a password reset, please ignore this email or contact support if you have concerns.
          </div>
          
          <p style="font-size: 14px; color: #64748b; margin-top: 30px;">
            If you're having trouble clicking the button, copy and paste the URL above into your web browser.
          </p>
        </div>
        <div class="footer">
          <p>This is an automated message from CardioMate AI. Please do not reply to this email.</p>
          <p>&copy; ${new Date().getFullYear()} CardioMate AI. All rights reserved.</p>
        </div>
      </body>
      </html>
    `,
    text: `
CardioMate AI - Password Reset Request

Hello${userName ? ` ${userName}` : ""},

We received a request to reset your password for your CardioMate AI account.

Click the link below to reset your password:
${resetUrl}

This link will expire in 1 hour.

If you didn't request a password reset, please ignore this email or contact support.

---
CardioMate AI
    `.trim(),
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`✅ Password reset email sent to ${email}`);
  } catch (error: any) {
    console.error(`❌ Failed to send password reset email to ${email}:`, error.message);
    await logSystemEvent({
      eventType: "email_error",
      message: `Failed to send password reset email to ${email}`,
      context: { email, error: error?.message },
    });
    throw new Error("Failed to send password reset email");
  }
}

