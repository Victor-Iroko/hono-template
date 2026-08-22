import type { MiddlewareHandler } from "hono";
import { getCookie } from "hono/cookie";
import { verifyAccessToken, type TokenPayload } from "../core/jwt.js";
import { UnauthorizedError } from "../core/errors.js";
import { requestContext } from "../core/request-context.js";

export const requireJwtAuth: MiddlewareHandler = async (c, next) => {
  const authHeader = c.req.header("authorization");
  let token: string | undefined;

  if (authHeader && authHeader.startsWith("Bearer ")) {
    token = authHeader.slice(7).trim();
  } else {
    token = getCookie(c, "access_token");
  }

  if (!token) {
    throw new UnauthorizedError("Authentication token is required");
  }

  try {
    const payload: TokenPayload = await verifyAccessToken(token);
    requestContext.setUserId(payload.userId);
    c.set("user" as never, payload);
  } catch {
    throw new UnauthorizedError("Invalid or expired authentication token");
  }

  await next();
};
