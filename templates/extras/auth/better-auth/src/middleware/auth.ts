import { createMiddleware } from "hono/factory";
import { auth } from "../core/auth.js";
import { unauthorizedError } from "../core/errors.js";
import type { Variables } from "../index.js";

export const requireAuth = createMiddleware<{ Variables: Variables }>(async (c, next) => {
  const session = await auth.api.getSession({
    headers: c.req.raw.headers,
  });

  if (!session || !session.user) {
    throw unauthorizedError("Authentication required");
  }

  c.set("user", session.user);
  c.set("session", session.session);

  await next();
});


