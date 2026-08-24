import { z } from "zod";

export const sendEmailJobRequestSchema = z.object({
  to: z.union([z.string(), z.array(z.string())]),
  subject: z.string().min(1),
  html: z.string().optional(),
  text: z.string().optional(),
});

export type SendEmailJobRequest = z.infer<typeof sendEmailJobRequestSchema>;

export const sendEmailJobResponseSchema = z.object({
  id: z.string(),
  from: z.string(),
  to: z.array(z.string()),
});

export type SendEmailJobResponse = z.infer<typeof sendEmailJobResponseSchema>;
