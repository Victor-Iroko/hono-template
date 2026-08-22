import {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
  type JwtPayload,
} from "./tokens.js";
import type { LoginInput, RegisterInput } from "./schemas.js";

export async function loginUser(input: LoginInput) {
  // Demo user lookup (in real app, query db and verify hashed password)
  const user = {
    id: crypto.randomUUID(),
    email: input.email,
    name: "Demo User",
    role: "user",
  };

  const payload: JwtPayload = {
    userId: user.id,
    email: user.email,
    role: user.role,
  };

  const accessToken = await signAccessToken(payload);
  const refreshToken = await signRefreshToken(payload);

  return { user, tokens: { accessToken, refreshToken } };
}

export async function registerUser(input: RegisterInput) {
  const user = {
    id: crypto.randomUUID(),
    email: input.email,
    name: input.name ?? "New User",
    role: "user",
  };

  const payload: JwtPayload = {
    userId: user.id,
    email: user.email,
    role: user.role,
  };

  const accessToken = await signAccessToken(payload);
  const refreshToken = await signRefreshToken(payload);

  return { user, tokens: { accessToken, refreshToken } };
}

export async function refreshTokens(refreshToken: string) {
  const payload = await verifyRefreshToken(refreshToken);
  const newPayload: JwtPayload = {
    userId: payload.userId,
    email: payload.email,
    role: payload.role,
  };

  const accessToken = await signAccessToken(newPayload);
  const newRefreshToken = await signRefreshToken(newPayload);

  return { tokens: { accessToken, refreshToken: newRefreshToken } };
}
