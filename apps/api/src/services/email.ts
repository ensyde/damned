import nodemailer from "nodemailer";
import { logger } from "../utils/logger";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT ?? "587"),
  secure: process.env.SMTP_PORT === "465",
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

const FROM = process.env.EMAIL_FROM ?? "Damned Community <no-reply@damned.gg>";
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export const emailService = {
  async sendVerification(email: string, username: string, token: string): Promise<void> {
    const link = `${SITE_URL}/verify-email?token=${token}`;
    await transporter
      .sendMail({
        from: FROM,
        to: email,
        subject: "Verify your email – Damned Community",
        html: `
          <h2>Welcome, ${username}!</h2>
          <p>Please verify your email address by clicking the link below:</p>
          <a href="${link}" style="display:inline-block;padding:12px 24px;background:#6366f1;color:#fff;border-radius:6px;text-decoration:none;">Verify Email</a>
          <p>This link expires in 24 hours.</p>
        `,
      })
      .catch((err) => logger.error("Failed to send verification email", err));
  },

  async sendPasswordReset(email: string, username: string, token: string): Promise<void> {
    const link = `${SITE_URL}/reset-password?token=${token}`;
    await transporter
      .sendMail({
        from: FROM,
        to: email,
        subject: "Password Reset – Damned Community",
        html: `
          <h2>Hi ${username},</h2>
          <p>Click below to reset your password. This link expires in 1 hour.</p>
          <a href="${link}" style="display:inline-block;padding:12px 24px;background:#6366f1;color:#fff;border-radius:6px;text-decoration:none;">Reset Password</a>
          <p>If you did not request this, ignore this email.</p>
        `,
      })
      .catch((err) => logger.error("Failed to send password reset email", err));
  },

  async sendNotificationDigest(
    email: string,
    username: string,
    notifications: Array<{ title: string; body?: string | null; link?: string | null }>
  ): Promise<void> {
    const items = notifications
      .map(
        (n) =>
          `<li><strong>${n.title}</strong>${n.body ? `: ${n.body}` : ""}${n.link ? ` <a href="${SITE_URL}${n.link}">View</a>` : ""}</li>`
      )
      .join("");

    await transporter
      .sendMail({
        from: FROM,
        to: email,
        subject: `You have ${notifications.length} new notification(s) – Damned Community`,
        html: `
          <h2>Hi ${username},</h2>
          <p>Here are your latest notifications:</p>
          <ul>${items}</ul>
          <p><a href="${SITE_URL}/notifications">View all notifications</a></p>
        `,
      })
      .catch((err) => logger.error("Failed to send notification digest", err));
  },
};
