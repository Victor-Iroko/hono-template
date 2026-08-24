import { createMiddleware } from "hono/factory";
import { extractBearerToken, verifyAccessToken } from "../api/v1/auth/tokens.js";
import { unauthorizedError } from "../core/errors.js";
import type { Variables } from "../index.js";

export const requireAuth = createMiddleware<{ Variables: Variables }>(async (c, next) => {
  const token = extractBearerToken(c);
  if (!token) {
    throw unauthorizedError("Authentication required");
  }

  const payload = await verifyAccessToken(token);
  c.set("user", payload);

  await next();
});

