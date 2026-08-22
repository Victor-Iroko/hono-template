import { Hono } from "hono";
import { z } from "zod";
import {
  initializeTransaction,
  verifyTransaction,
  verifyWebhookSignature,
} from "../../integrations/payments/paystack.js";
import { validationError, unauthorizedError } from "../../core/errors.js";
import { logger } from "../../core/logger.js";

const initializeSchema = z.object({
  email: z.string().email(),
  amount: z.number().positive(),
  callback_url: z.string().url().optional(),
  metadata: z.record(z.unknown()).optional(),
});

export const paymentsRouter = new Hono();

paymentsRouter.post("/initialize", async (c) => {
  const body = await c.req.json().catch(() => null);
  const parsed = initializeSchema.safeParse(body);
  if (!parsed.success) {
    throw validationError("Invalid payment payload", { issues: parsed.error.issues });
  }

  const response = await initializeTransaction(parsed.data);
  return c.json(response);
});

paymentsRouter.get("/verify/:reference", async (c) => {
  const reference = c.req.param("reference");
  if (!reference) {
    throw validationError("Payment reference is required");
  }

  const response = await verifyTransaction(reference);
  return c.json(response);
});

paymentsRouter.post("/webhook", async (c) => {
  const signature = c.req.header("x-paystack-signature");
  if (!signature) {
    throw unauthorizedError("Missing webhook signature");
  }

  const rawBody = await c.req.text();
  const isValid = verifyWebhookSignature(rawBody, signature);
  if (!isValid) {
    throw unauthorizedError("Invalid webhook signature");
  }

  const event = JSON.parse(rawBody) as { event: string; data: Record<string, unknown> };
  logger.info({ event: event.event }, "Received Paystack webhook event");

  // Handle event types (e.g. charge.success, transfer.success)
  switch (event.event) {
    case "charge.success":
      logger.info({ reference: event.data.reference }, "Payment successful");
      break;
    default:
      break;
  }

  return c.json({ status: "success" });
});
