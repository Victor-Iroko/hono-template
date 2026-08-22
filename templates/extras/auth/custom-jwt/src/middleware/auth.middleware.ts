import { createMiddleware } from "hono/factory";
import { extractBearerToken, verifyAccessToken } from "../api/v1/auth/tokens.js";
import { unauthorizedError } from "../core/errors.js";

export const requireAuth = createMiddleware(async (c, next) => {
  const token = extractBearerToken(c);
  if (!token) {
    throw unauthorizedError("Authentication required");
  }

  const payload = await verifyAccessToken(token);
  c.set("user", payload);

  await next();
});
