import { createMiddleware } from "hono/factory";
import { unauthorizedError, permissionDeniedError } from "../core/errors.js";
import { auth } from "../utils/auth.js";
import type { Variables } from "../index.js";

export function authMiddleware(allowedRoles?: string[]) {
  return createMiddleware<{ Variables: Variables }>(async (c, next) => {
    const session = await auth.api.getSession({ headers: c.req.raw.headers });

    if (!session) throw unauthorizedError("Not authenticated");
    if (!session.user.emailVerified)
      throw permissionDeniedError("Email not verified. Please verify your email first.");

    const role = (session.user as Record<string, unknown>).role as string | undefined;

    if (allowedRoles?.length && (!role || !allowedRoles.includes(role)))
      throw permissionDeniedError("Insufficient permissions");

    c.set("user", session.user);
    c.set("session", session.session);
    await next();
  });
}

// example roles
export const buyer = authMiddleware(["buyer", "seller", "admin"]);
export const seller = authMiddleware(["seller", "admin"]);
export const admin = authMiddleware(["admin"]);
