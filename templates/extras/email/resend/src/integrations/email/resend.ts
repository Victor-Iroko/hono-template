import { Resend } from "resend";
import { env } from "../../../core/env-validation.js";

export interface SendEmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  from?: string;
}

let _resend: Resend | undefined;

export function getResend(): Resend {
  return (_resend ??= new Resend(env.RESEND_API_KEY));
}

export const emailService = {
  send: async (options: SendEmailOptions): Promise<{ messageId?: string }> => {
    const defaultFrom = env.EMAIL_FROM;
    const resend = getResend();

    const { data, error } = await resend.emails.send({
      from: options.from || defaultFrom,
      to: Array.isArray(options.to) ? options.to : [options.to],
      subject: options.subject,
      html: options.html,
      text: options.text,
    });

    if (error) {
      throw new Error(`Failed to send email via Resend: ${error.message}`);
    }

    return { messageId: data?.id };
  },
};
