import { Hono } from "hono";
import { qstashAuth } from "./auth.middleware.js";
import { sendEmailJobRequestSchema } from "./schemas.js";
import { sendEmailJobService } from "./service.js";

const jobsRouter = new Hono();

jobsRouter.post("/send-email", qstashAuth, async (c) => {
  const body = await c.req.json().catch(() => null);
  const parsed = sendEmailJobRequestSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ success: false, error: parsed.error.format() }, 400);
  }

  const result = await sendEmailJobService(parsed.data);
  return c.json({ success: true, data: result }, 200);
});

export { jobsRouter };
