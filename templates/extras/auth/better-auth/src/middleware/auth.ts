import type { MiddlewareHandler } from "hono";
import { auth } from "../core/auth.js";
import { UnauthorizedError } from "../core/errors.js";
import { requestContext } from "../core/request-context.js";

export const requireAuth: MiddlewareHandler = async (c, next) => {
  const session = await auth.api.getSession({
    headers: c.req.raw.headers,
  });

  if (!session || !session.user) {
    throw new UnauthorizedError("Authentication required");
  }

  requestContext.setUserId(session.user.id);
  c.set("user" as never, session.user);
  c.set("session" as never, session.session);

  await next();
};
