import { Resend } from "resend";

export interface SendEmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  from?: string;
}

let resendInstance: Resend | null = null;

export function getResend(): Resend {
  if (!resendInstance) {
    const apiKey = process.env.RESEND_API_KEY || "re_test_123456789";
    resendInstance = new Resend(apiKey);
  }
  return resendInstance;
}

export const emailService = {
  send: async (options: SendEmailOptions): Promise<{ messageId?: string }> => {
    const defaultFrom = process.env.DEFAULT_FROM_EMAIL || process.env.EMAIL_FROM || "onboarding@resend.dev";
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
