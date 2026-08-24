import { randomUUID } from "node:crypto";
import {
  generateOpaqueRefreshToken,
  hashRefreshToken,
  signAccessToken,
} from "./tokens.js";
import { logSecurityAudit } from "./audit.js";
import { env } from "../../../core/env-validation.js";
import { unauthorizedError } from "../../../core/errors.js";

// Inferred session type matching Drizzle userSessions schema
export interface UserSession {
  id: string;
  userId: string;
  sessionId: string;
  refreshTokenHash: string;
  deviceName?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  expiresAt: Date;
  createdAt: Date;
  lastActiveAt: Date;
}

export interface ClientMeta {
  deviceId?: string;
  deviceName?: string;
  ipAddress?: string;
  userAgent?: string;
}

export interface SessionUser {
  id: string;
  email: string;
  name?: string;
  role?: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  sessionId: string;
  expiresIn: number;
}

const SESSION_LIFETIME_MS = env.SESSION_EXPIRE_DAYS * 24 * 60 * 60 * 1000;
const ACCESS_TOKEN_EXPIRE_SECONDS = env.ACCESS_TOKEN_EXPIRE_MINUTES * 60;

// In-memory session store (can be seamlessly swapped or augmented with a database/Redis store)
const sessionStore = new Map<string, UserSession>();
const tokenHashToSessionId = new Map<string, string>();
const consumedTokenHashes = new Map<string, string>();

export async function upsertUserSession(
  user: SessionUser,
  meta?: ClientMeta
): Promise<{ tokens: AuthTokens }> {
  const sessionId = randomUUID();
  const rawRefreshToken = generateOpaqueRefreshToken();
  const refreshTokenHash = hashRefreshToken(rawRefreshToken);
  const now = new Date();
  const expiresAt = new Date(now.getTime() + SESSION_LIFETIME_MS);

  const session: UserSession = {
    id: randomUUID(),
    userId: user.id,
    sessionId,
    refreshTokenHash,
    deviceName: meta?.deviceName ?? null,
    ipAddress: meta?.ipAddress ?? null,
    userAgent: meta?.userAgent ?? null,
    createdAt: now,
    lastActiveAt: now,
    expiresAt,
  };

  sessionStore.set(sessionId, session);
  tokenHashToSessionId.set(refreshTokenHash, sessionId);

  await logSecurityAudit(user.id, "login", meta?.ipAddress, {
    sessionId,
    deviceId: meta?.deviceId,
    deviceName: meta?.deviceName,
  });

  const accessToken = await signAccessToken({
    userId: user.id,
    email: user.email,
    role: user.role,
    sid: sessionId,
  });

  return {
    tokens: {
      accessToken,
      refreshToken: rawRefreshToken,
      sessionId,
      expiresIn: ACCESS_TOKEN_EXPIRE_SECONDS,
    },
  };
}

export async function rotateUserSession(
  presentedRefreshToken: string,
  user: SessionUser,
  meta?: ClientMeta
): Promise<{ tokens: AuthTokens }> {
  const presentedHash = hashRefreshToken(presentedRefreshToken);

  // 1. Check if token was previously consumed (Token Reuse Detection)
  if (consumedTokenHashes.has(presentedHash)) {
    const compromisedSessionId = consumedTokenHashes.get(presentedHash);
    if (compromisedSessionId) {
      const compromisedSession = sessionStore.get(compromisedSessionId);
      if (compromisedSession) {
        sessionStore.delete(compromisedSessionId);
        tokenHashToSessionId.delete(compromisedSession.refreshTokenHash);
      }
      await logSecurityAudit(user.id, "token_reuse_detected", meta?.ipAddress, {
        sessionId: compromisedSessionId,
        deviceId: meta?.deviceId,
        reason: "previously_consumed_token_reused",
      });
    }
    throw unauthorizedError("Refresh token reuse detected. Device session revoked.");
  }

  const sessionId = tokenHashToSessionId.get(presentedHash);
  if (!sessionId) {
    throw unauthorizedError("Invalid or expired refresh token");
  }

  const session = sessionStore.get(sessionId);
  if (!session) {
    tokenHashToSessionId.delete(presentedHash);
    throw unauthorizedError("Invalid or expired refresh token");
  }

  const now = new Date();
  if (session.expiresAt.getTime() <= now.getTime()) {
    sessionStore.delete(sessionId);
    tokenHashToSessionId.delete(presentedHash);
    throw unauthorizedError("Refresh token has expired");
  }

  // Generate new opaque refresh token and rotate
  const newRefreshToken = generateOpaqueRefreshToken();
  const newRefreshTokenHash = hashRefreshToken(newRefreshToken);

  // Record old token as consumed
  tokenHashToSessionId.delete(presentedHash);
  consumedTokenHashes.set(presentedHash, sessionId);
  tokenHashToSessionId.set(newRefreshTokenHash, sessionId);

  session.refreshTokenHash = newRefreshTokenHash;
  session.lastActiveAt = now;
  session.expiresAt = new Date(now.getTime() + SESSION_LIFETIME_MS);
  if (meta?.ipAddress) session.ipAddress = meta.ipAddress;
  if (meta?.userAgent) session.userAgent = meta.userAgent;
  if (meta?.deviceName) session.deviceName = meta.deviceName;

  sessionStore.set(sessionId, session);

  await logSecurityAudit(session.userId, "session_replaced", meta?.ipAddress, {
    sessionId,
    deviceId: meta?.deviceId,
  });

  const accessToken = await signAccessToken({
    userId: user.id,
    email: user.email,
    role: user.role,
    sid: sessionId,
  });

  return {
    tokens: {
      accessToken,
      refreshToken: newRefreshToken,
      sessionId,
      expiresIn: ACCESS_TOKEN_EXPIRE_SECONDS,
    },
  };
}

export async function revokeUserSession(sessionId: string): Promise<boolean> {
  const session = sessionStore.get(sessionId);
  if (session) {
    tokenHashToSessionId.delete(session.refreshTokenHash);
    const deleted = sessionStore.delete(sessionId);
    if (deleted) {
      await logSecurityAudit(session.userId, "session_revoked", undefined, { sessionId });
    }
    return deleted;
  }
  return false;
}

export async function revokeUserSessionByToken(refreshToken: string): Promise<boolean> {
  const hash = hashRefreshToken(refreshToken);
  const sessionId = tokenHashToSessionId.get(hash);
  if (sessionId) {
    return await revokeUserSession(sessionId);
  }
  return false;
}

export async function revokeAllUserSessions(userId: string): Promise<number> {
  let count = 0;
  for (const [sessionId, session] of sessionStore.entries()) {
    if (session.userId === userId) {
      tokenHashToSessionId.delete(session.refreshTokenHash);
      sessionStore.delete(sessionId);
      count++;
    }
  }
  if (count > 0) {
    await logSecurityAudit(userId, "session_revoked", undefined, { scope: "all_sessions", count });
  }
  return count;
}

export function getSessionByRefreshToken(refreshToken: string): UserSession | undefined {
  const hash = hashRefreshToken(refreshToken);
  const sessionId = tokenHashToSessionId.get(hash);
  if (!sessionId) return undefined;
  return sessionStore.get(sessionId);
}

export function cleanupExpiredSessions(): number {
  const now = Date.now();
  let cleaned = 0;
  for (const [sessionId, session] of sessionStore.entries()) {
    if (session.expiresAt.getTime() <= now) {
      tokenHashToSessionId.delete(session.refreshTokenHash);
      sessionStore.delete(sessionId);
      cleaned++;
    }
  }
  return cleaned;
}
