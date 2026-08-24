import nodemailer, { type Transporter } from "nodemailer";
import { getEnv } from "../../core/env-validation.js";
import { externalServiceError, validationError } from "../../core/errors.js";
import { logger } from "../../core/logger.js";

export type SendEmailParams = {
  to: string | string[];
  subject: string;
  html?: string;
  text?: string;
  from?: string;
};

let _transporter: Transporter | undefined;

export function getTransporter(): Transporter {
  if (_transporter) return _transporter;

  const env = getEnv();
  const smtpConfig = {
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_SECURE === "true" || env.SMTP_PORT === 465,
    auth: env.SMTP_USER
      ? {
          user: env.SMTP_USER,
          pass: env.SMTP_PASSWORD || "",
        }
      : undefined,
  };

  return (_transporter = nodemailer.createTransport(smtpConfig));
}

export async function sendEmail({ to, subject, html, text, from }: SendEmailParams): Promise<{ id: string; from: string; to: string[] }> {
  const toList = Array.isArray(to) ? to : [to];
  const fromEmail = from || getEnv().EMAIL_FROM;
  const content = html ?? text;
  if (!content) throw validationError("Either html or text content is required");

  try {
    const info = await getTransporter().sendMail({
      from: fromEmail,
      to: toList.join(", "),
      subject,
      html,
      text: text || (html ? html.replace(/<[^>]*>?/gm, "") : undefined),
    });

    logger.info({ messageId: info.messageId, to: toList }, "smtp_email_sent");
    return { id: info.messageId, from: fromEmail, to: toList };
  } catch (error) {
    logger.error({ error }, "smtp_send_failed");
    throw externalServiceError("Failed to send email via SMTP", { cause: error });
  }
}
