import { Hono } from "hono";
import type { Context } from "hono";
import { loginSchema, registerSchema, refreshSchema, logoutSchema } from "./schemas.js";
import {
  loginUser,
  registerUser,
  refreshTokens,
  logoutUser,
  logoutAllDevices,
} from "./service.js";
import { setAuthCookies, clearAuthCookies, type AccessTokenPayload } from "./tokens.js";
import type { ClientMeta } from "./session.js";
import { validationError } from "../../../core/errors.js";
import { requireAuth } from "../../../middleware/auth.middleware.js";
import type { Variables } from "../../../index.js";

function getClientMeta(c: Context<{ Variables: Variables }>): ClientMeta {
  return {
    deviceId: c.req.header("x-device-id"),
    deviceName: c.req.header("x-device-name"),
    userAgent: c.req.header("user-agent"),
    ipAddress: c.req.header("x-forwarded-for")?.split(",")[0]?.trim(),
  };
}

export const authRouter = new Hono<{ Variables: Variables }>();
// [INSTALLER:AUTH_ROUTES]


authRouter.post("/login", async (c) => {
  const body = await c.req.json().catch(() => null);
  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) {
    throw validationError("Invalid login credentials", { issues: parsed.error.issues });
  }

  const meta = getClientMeta(c);
  const result = await loginUser(parsed.data, meta);
  setAuthCookies(c, result.tokens.accessToken);

  return c.json({ success: true, ...result });
});

authRouter.post("/register", async (c) => {
  const body = await c.req.json().catch(() => null);
  const parsed = registerSchema.safeParse(body);
  if (!parsed.success) {
    throw validationError("Invalid registration data", { issues: parsed.error.issues });
  }

  const meta = getClientMeta(c);
  const result = await registerUser(parsed.data, meta);
  setAuthCookies(c, result.tokens.accessToken);

  return c.json({ success: true, ...result }, 201);
});

authRouter.post("/refresh", async (c) => {
  const body = await c.req.json().catch(() => null);
  const parsed = refreshSchema.safeParse(body);
  if (!parsed.success) {
    throw validationError("Invalid refresh payload", { issues: parsed.error.issues });
  }

  const meta = getClientMeta(c);
  const result = await refreshTokens(parsed.data.refreshToken, meta);
  setAuthCookies(c, result.tokens.accessToken);

  return c.json({ success: true, ...result });
});

authRouter.post("/logout", async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const parsed = logoutSchema.safeParse(body);
  const user = c.get("user");

  await logoutUser(user?.sid, parsed.success ? parsed.data.refreshToken : undefined);
  clearAuthCookies(c);

  return c.json({ success: true, message: "Logged out successfully" });
});

authRouter.post("/logout/all", requireAuth, async (c) => {
  const user = c.get("user");
  const revokedCount = user ? await logoutAllDevices(user.userId) : 0;
  clearAuthCookies(c);

  return c.json({
    success: true,
    message: `Logged out from all devices (${revokedCount} session(s) revoked)`,
  });
});

authRouter.get("/me", requireAuth, (c) => {
  const user = c.get("user");
  return c.json({ success: true, user });
});

