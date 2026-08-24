import { publishSendEmail } from "../qstash.js";

export type EmailTemplateName =
  | "email_verification"
  | "password_reset"
  | "welcome"
  | "account_deletion"
  | "email_change"
  | "email_change_notification"
  | "password_changed_notification";

export type EmailTemplateData = {
  email_verification: { otp: string };
  password_reset: { otp: string };
  welcome: { name?: string | null };
  account_deletion: { otp: string };
  email_change: { otp: string; newEmail: string };
  email_change_notification: { newEmail: string };
  password_changed_notification: Record<string, never>;
};

export const emailTemplateData: {
  [K in EmailTemplateName]: (data: EmailTemplateData[K]) => { subject: string; html: string; text?: string };
} = {
  email_verification: ({ otp }) => ({
    subject: "Verify Your Email Address",
    html: `<!DOCTYPE html>
<html>
  <head><meta charset="utf-8"><style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1e293b; background-color: #f8fafc; padding: 20px; }
    .container { max-width: 500px; margin: 0 auto; background: #ffffff; border-radius: 8px; padding: 32px; border: 1px solid #e2e8f0; }
    .otp-badge { display: inline-block; font-size: 32px; font-weight: 700; letter-spacing: 6px; padding: 12px 24px; background: #f1f5f9; color: #4f46e5; border-radius: 8px; margin: 20px 0; border: 1px dashed #cbd5e1; }
    .footer { font-size: 12px; color: #64748b; margin-top: 24px; }
  </style></head>
  <body>
    <div class="container">
      <h2>Email Verification</h2>
      <p>Please use the following verification code to complete your verification:</p>
      <div style="text-align: center;">
        <div class="otp-badge">${otp}</div>
      </div>
      <p>This verification code will expire in <strong>10 minutes</strong>.</p>
      <p>If you did not request this code, you can safely ignore this email.</p>
      <div class="footer"><p>This is an automated security message, please do not reply.</p></div>
    </div>
  </body>
</html>`,
    text: `Your verification code is: ${otp}\n\nThis code will expire in 10 minutes.\nIf you did not request this, please ignore this email.`,
  }),
  password_reset: ({ otp }) => ({
    subject: "Reset Your Password - Verification Code",
    html: `<!DOCTYPE html>
<html>
  <head><meta charset="utf-8"><style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1e293b; background-color: #f8fafc; padding: 20px; }
    .container { max-width: 500px; margin: 0 auto; background: #ffffff; border-radius: 8px; padding: 32px; border: 1px solid #e2e8f0; }
    .otp-badge { display: inline-block; font-size: 32px; font-weight: 700; letter-spacing: 6px; padding: 12px 24px; background: #f1f5f9; color: #4f46e5; border-radius: 8px; margin: 20px 0; border: 1px dashed #cbd5e1; }
    .footer { font-size: 12px; color: #64748b; margin-top: 24px; }
  </style></head>
  <body>
    <div class="container">
      <h2>Password Reset Request</h2>
      <p>Please use the following verification code to reset your password:</p>
      <div style="text-align: center;">
        <div class="otp-badge">${otp}</div>
      </div>
      <p>This verification code will expire in <strong>10 minutes</strong>.</p>
      <p>If you did not request this code, you can safely ignore this email.</p>
      <div class="footer"><p>This is an automated security message, please do not reply.</p></div>
    </div>
  </body>
</html>`,
    text: `Your password reset code is: ${otp}\n\nThis code will expire in 10 minutes.\nIf you did not request this, please ignore this email.`,
  }),
  welcome: ({ name }) => {
    const greeting = name ? `, ${name}` : "";
    return {
      subject: "Welcome!",
      html: `<h1>Welcome${greeting}!</h1>
<p>Your email has been verified. You're now part of our community!</p>
<p>Start exploring and building today!</p>`,
      text: `Welcome${greeting}!\n\nYour email has been verified. You're now part of our community!`,
    };
  },
  account_deletion: ({ otp }) => ({
    subject: "Account Deletion Code",
    html: `<p>Your account deletion code is <strong>${otp}</strong>.</p><p>This code expires in 10 minutes. If you didn't request this, ignore this email.</p>`,
    text: `Your account deletion code is ${otp}. This code expires in 10 minutes.`,
  }),
  email_change: ({ otp, newEmail }) => ({
    subject: "Email Change Verification Code",
    html: `<p>Your email change verification code is <strong>${otp}</strong>.</p><p>This code was sent because you requested to change your email to <strong>${newEmail}</strong>. If you didn't request this, ignore this email.</p>`,
    text: `Your email change verification code is ${otp} for changing email to ${newEmail}.`,
  }),
  email_change_notification: ({ newEmail }) => ({
    subject: "Your Email Address Has Been Changed",
    html: `<p>Your email address has been changed to <strong>${newEmail}</strong>.</p><p>If you didn't make this change, please contact support immediately.</p>`,
    text: `Your email address has been changed to ${newEmail}. If you didn't make this change, please contact support immediately.`,
  }),
  password_changed_notification: () => ({
    subject: "Your Password Has Been Changed",
    html: `<p>Your password has been changed successfully.</p><p>If you didn't make this change, please contact support immediately.</p>`,
    text: `Your password has been changed successfully. If you didn't make this change, please contact support immediately.`,
  }),
};

export async function sendTemplatedEmail<K extends EmailTemplateName>(
  to: string | string[],
  template: K,
  data: EmailTemplateData[K]
) {
  const { subject, html, text } = emailTemplateData[template](data);
  return publishSendEmail({ to, subject, html, text });
}
