import {
  upsertUserSession,
  rotateUserSession,
  revokeUserSession,
  revokeUserSessionByToken,
  revokeAllUserSessions,
  getSessionByRefreshToken,
  type ClientMeta,
  type SessionUser,
} from "./session.js";
import type { LoginInput, RegisterInput } from "./schemas.js";
import { unauthorizedError } from "../../../core/errors.js";

export async function loginUser(input: LoginInput, meta?: ClientMeta) {
  // Demo user lookup (in a real application, query db and verify hashed password)
  const user: SessionUser = {
    id: "demo-user-id-12345",
    email: input.email,
    name: "Demo User",
    role: "user",
  };

  const { tokens } = await upsertUserSession(user, meta);

  return { user, tokens };
}

export async function registerUser(input: RegisterInput, meta?: ClientMeta) {
  // Demo user creation (in a real application, hash password and insert into db)
  const user: SessionUser = {
    id: crypto.randomUUID(),
    email: input.email,
    name: input.name ?? "New User",
    role: "user",
  };

  const { tokens } = await upsertUserSession(user, meta);

  return { user, tokens };
}

export async function refreshTokens(refreshToken: string, meta?: ClientMeta) {
  const session = getSessionByRefreshToken(refreshToken);
  if (!session) {
    throw unauthorizedError("Invalid or expired refresh token");
  }

  // Demo user retrieval associated with session
  const user: SessionUser = {
    id: session.userId,
    email: "demo@example.com",
    role: "user",
  };

  const { tokens } = await rotateUserSession(refreshToken, user, meta);

  return { user, tokens };
}

export async function logoutUser(sessionId?: string, refreshToken?: string): Promise<boolean> {
  if (sessionId) {
    return revokeUserSession(sessionId);
  }
  if (refreshToken) {
    return revokeUserSessionByToken(refreshToken);
  }
  return false;
}

export async function logoutAllDevices(userId: string): Promise<number> {
  return revokeAllUserSessions(userId);
}
