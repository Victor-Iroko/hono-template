import nodemailer, { type Transporter } from "nodemailer";
import { env } from "../core/env-validation.js";

export interface SendEmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  from?: string;
}

let _transporter: Transporter | undefined;

export function getTransporter(): Transporter {
  if (_transporter) return _transporter;

  const smtpConfig = {
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_SECURE === "true",
    auth: env.SMTP_USER
      ? {
          user: env.SMTP_USER,
          pass: env.SMTP_PASSWORD || "",
        }
      : undefined,
  };

  return (_transporter = nodemailer.createTransport(smtpConfig));
}

export const emailService = {
  send: async (options: SendEmailOptions): Promise<{ messageId: string }> => {
    const defaultFrom = env.EMAIL_FROM;
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
