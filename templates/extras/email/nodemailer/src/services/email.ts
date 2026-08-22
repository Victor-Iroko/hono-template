import nodemailer, { type Transporter } from "nodemailer";

export interface SendEmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  from?: string;
}

let transporterInstance: Transporter | null = null;

export function getTransporter(): Transporter {
  if (!transporterInstance) {
    const smtpConfig = {
      host: process.env.SMTP_HOST || "localhost",
      port: Number(process.env.SMTP_PORT) || 587,
      secure: process.env.SMTP_SECURE === "true",
      auth: process.env.SMTP_USER
        ? {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASSWORD || "",
          }
        : undefined,
    };
    transporterInstance = nodemailer.createTransport(smtpConfig);
  }
  return transporterInstance;
}

export const emailService = {
  send: async (options: SendEmailOptions): Promise<{ messageId: string }> => {
    const defaultFrom = process.env.EMAIL_FROM || "noreply@example.com";
    const info = await getTransporter().sendMail({
      from: options.from || defaultFrom,
      to: Array.isArray(options.to) ? options.to.join(", ") : options.to,
      subject: options.subject,
      html: options.html,
      text: options.text || options.html.replace(/<[^>]*>?/gm, ""),
    });

    return { messageId: info.messageId };
  },
};
