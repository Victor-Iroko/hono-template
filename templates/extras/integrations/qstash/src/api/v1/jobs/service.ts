import { sendEmail } from "../../../integrations/email/email.js";
import type { SendEmailJobRequest, SendEmailJobResponse } from "./schemas.js";

export async function sendEmailJobService(
  body: SendEmailJobRequest
): Promise<SendEmailJobResponse> {
  const result = await sendEmail(body);
  return {
    id: result.id,
    from: result.from,
    to: result.to,
  };
}
