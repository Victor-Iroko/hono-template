export type SendEmailParams = {
  to: string | string[];
  subject: string;
  html?: string;
  text?: string;
  from?: string;
};

export async function sendEmail({ to, subject, html, text, from }: SendEmailParams): Promise<{ id: string; from: string; to: string[] }> {
  const toList = Array.isArray(to) ? to : [to];
  const fromEmail = from || "noreply@example.com";
  const id = `mock_email_${Date.now()}`;

  console.info(`[Email Mock] (${id}) ${subject} -> ${toList.join(", ")}`);
  return { id, from: fromEmail, to: toList };
}
