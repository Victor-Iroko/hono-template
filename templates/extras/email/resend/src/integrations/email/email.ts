import { Resend } from "resend";
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

let resendClient: Resend | null = null;

export function getResend(): Resend {
  if (!resendClient) {
    resendClient = new Resend(getEnv().RESEND_API_KEY);
  }
  return resendClient;
}

export async function sendEmail({ to, subject, html, text, from }: SendEmailParams): Promise<{ id: string; from: string; to: string[] }> {
  const toList = Array.isArray(to) ? to : [to];
  const fromEmail = from || getEnv().EMAIL_FROM;
  const content = html ?? (text ? `<pre>${text}</pre>` : undefined);
  if (!content) throw validationError("Either html or text content is required");

  const resend = getResend();
  const { data, error } = await resend.emails.send({
    from: fromEmail,
    to: toList,
    subject,
    html: content,
    text,
  });

  if (error) {
    logger.error({ error }, "resend_send_failed");
    throw externalServiceError(`Failed to send email via Resend: ${error.message}`);
  }

  logger.info({ id: data?.id, to: toList }, "resend_email_sent");
  return { id: data?.id ?? "resend_sent", from: fromEmail, to: toList };
}
