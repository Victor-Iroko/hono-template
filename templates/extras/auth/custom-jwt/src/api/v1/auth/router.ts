import { Hono } from "hono";
import type { Context } from "hono";
import {
  loginSchema,
  registerSchema,
  refreshSchema,
  logoutSchema,
  verifyOtpSchema,
  resendOtpSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  changePasswordSchema,
} from "./schemas.js";
import {
  loginUser,
  registerUser,
  verifyUserEmailOtp,
  resendUserEmailOtp,
  refreshTokens,
  logoutUser,
  logoutAllDevices,
  requestForgotPasswordOtp,
  resetPasswordWithOtp,
  requestPasswordChangeOtp,
  changePasswordWithOtp,
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

  return c.json({ success: true, ...result }, 201);
});

authRouter.post("/verify-otp", async (c) => {
  const body = await c.req.json().catch(() => null);
  const parsed = verifyOtpSchema.safeParse(body);
  if (!parsed.success) {
    throw validationError("Invalid OTP verification data", { issues: parsed.error.issues });
  }

  const meta = getClientMeta(c);
  const result = await verifyUserEmailOtp(parsed.data, meta);
  setAuthCookies(c, result.tokens.accessToken);

  return c.json({ success: true, ...result });
});

authRouter.post("/resend-otp", async (c) => {
  const body = await c.req.json().catch(() => null);
  const parsed = resendOtpSchema.safeParse(body);
  if (!parsed.success) {
    throw validationError("Invalid resend OTP data", { issues: parsed.error.issues });
  }

  const meta = getClientMeta(c);
  const result = await resendUserEmailOtp(parsed.data, meta);

  return c.json({ success: true, ...result });
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

authRouter.post("/forgot-password", async (c) => {
  const body = await c.req.json().catch(() => null);
  const parsed = forgotPasswordSchema.safeParse(body);
  if (!parsed.success) {
    throw validationError("Invalid forgot password payload", { issues: parsed.error.issues });
  }

  const meta = getClientMeta(c);
  const result = await requestForgotPasswordOtp(parsed.data, meta);

  return c.json(result);
});

authRouter.post("/reset-password", async (c) => {
  const body = await c.req.json().catch(() => null);
  const parsed = resetPasswordSchema.safeParse(body);
  if (!parsed.success) {
    throw validationError("Invalid reset password payload", { issues: parsed.error.issues });
  }

  const meta = getClientMeta(c);
  const result = await resetPasswordWithOtp(parsed.data, meta);

  return c.json(result);
});

authRouter.post("/change-password/request-otp", requireAuth, async (c) => {
  const user = c.get("user");
  if (!user?.email) {
    throw validationError("User email not found in session");
  }

  const meta = getClientMeta(c);
  const result = await requestPasswordChangeOtp(user.email, user.userId, meta);

  return c.json(result);
});

authRouter.post("/change-password", requireAuth, async (c) => {
  const user = c.get("user");
  if (!user?.email || !user?.userId) {
    throw validationError("User email or ID not found in session");
  }

  const body = await c.req.json().catch(() => null);
  const parsed = changePasswordSchema.safeParse(body);
  if (!parsed.success) {
    throw validationError("Invalid change password payload", { issues: parsed.error.issues });
  }

  const meta = getClientMeta(c);
  const result = await changePasswordWithOtp(user.userId, user.email, parsed.data, meta);

  return c.json(result);
});

