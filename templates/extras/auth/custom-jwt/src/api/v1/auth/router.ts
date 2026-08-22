import { Hono } from "hono";
import { loginSchema, registerSchema, refreshSchema } from "./schemas.js";
import { loginUser, registerUser, refreshTokens } from "./service.js";
import { setAuthCookies, clearAuthCookies } from "./tokens.js";
import { validationError } from "../../../core/errors.js";
import { requireAuth } from "../../../middleware/auth.middleware.js";

export const authRouter = new Hono();

authRouter.post("/login", async (c) => {
  const body = await c.req.json().catch(() => null);
  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) {
    throw validationError("Invalid login credentials", { issues: parsed.error.issues });
  }

  const result = await loginUser(parsed.data);
  setAuthCookies(c, result.tokens.accessToken);

  return c.json({ success: true, ...result });
});

authRouter.post("/register", async (c) => {
  const body = await c.req.json().catch(() => null);
  const parsed = registerSchema.safeParse(body);
  if (!parsed.success) {
    throw validationError("Invalid registration data", { issues: parsed.error.issues });
  }

  const result = await registerUser(parsed.data);
  setAuthCookies(c, result.tokens.accessToken);

  return c.json({ success: true, ...result }, 201);
});

authRouter.post("/refresh", async (c) => {
  const body = await c.req.json().catch(() => null);
  const parsed = refreshSchema.safeParse(body);
  if (!parsed.success) {
    throw validationError("Invalid refresh payload", { issues: parsed.error.issues });
  }

  const result = await refreshTokens(parsed.data.refreshToken);
  setAuthCookies(c, result.tokens.accessToken);

  return c.json({ success: true, ...result });
});

authRouter.post("/logout", (c) => {
  clearAuthCookies(c);
  return c.json({ success: true, message: "Logged out successfully" });
});

authRouter.get("/me", requireAuth, (c) => {
  const user = c.get("user");
  return c.json({ success: true, user });
});
