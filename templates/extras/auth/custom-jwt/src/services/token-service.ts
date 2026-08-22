import {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
  type TokenPayload,
} from "../core/jwt.js";
import { UnauthorizedError } from "../core/errors.js";

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export async function generateAuthTokens(user: { id: string; email: string; role?: string }): Promise<AuthTokens> {
  const payload: TokenPayload = {
    userId: user.id,
    email: user.email,
    role: user.role,
  };

  const accessToken = await signAccessToken(payload);
  const refreshToken = await signRefreshToken(payload);

  return { accessToken, refreshToken };
}

export async function refreshAccessToken(refreshToken: string): Promise<AuthTokens> {
  try {
    const payload = await verifyRefreshToken(refreshToken);
    return await generateAuthTokens({
      id: payload.userId,
      email: payload.email,
      role: payload.role,
    });
  } catch {
    throw new UnauthorizedError("Invalid or expired refresh token");
  }
}
