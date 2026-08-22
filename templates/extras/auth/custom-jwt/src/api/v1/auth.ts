import { Hono } from "hono";
import { z } from "zod";
import { setCookie, deleteCookie } from "hono/cookie";
import { generateAuthTokens, refreshAccessToken } from "../../services/token-service.js";
import { requireJwtAuth } from "../../middleware/jwt-auth.js";
import { ValidationError } from "../../core/errors.js";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

const refreshSchema = z.object({
  refreshToken: z.string().min(1),
});

export const authRouter = new Hono();

authRouter.post("/login", async (c) => {
  const body = await c.req.json().catch(() => null);
  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) {
    throw new ValidationError("Invalid login credentials", parsed.error.format());
  }

  // Demo user identification (replace with actual db user check and bcrypt verify)
  const user = {
    id: crypto.randomUUID(),
    email: parsed.data.email,
    role: "user",
  };

  const tokens = await generateAuthTokens(user);

  setCookie(c, "access_token", tokens.accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "Lax",
    maxAge: 60 * 15,
  });

  return c.json({
    success: true,
    user,
    tokens,
  });
});

authRouter.post("/refresh", async (c) => {
  const body = await c.req.json().catch(() => null);
  const parsed = refreshSchema.safeParse(body);
  if (!parsed.success) {
    throw new ValidationError("Invalid refresh payload", parsed.error.format());
  }

  const tokens = await refreshAccessToken(parsed.data.refreshToken);

  setCookie(c, "access_token", tokens.accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "Lax",
    maxAge: 60 * 15,
  });

  return c.json({
    success: true,
    tokens,
  });
});

authRouter.post("/logout", (c) => {
  deleteCookie(c, "access_token");
  return c.json({
    success: true,
    message: "Logged out successfully",
  });
});

authRouter.get("/me", requireJwtAuth, (c) => {
  const user = c.get("user" as never);
  return c.json({
    success: true,
    user,
  });
});
