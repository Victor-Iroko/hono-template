import { createHash, randomBytes } from "node:crypto";
import { SignJWT, jwtVerify, type JWTPayload } from "jose";
import type { Context } from "hono";
import { getCookie, setCookie, deleteCookie } from "hono/cookie";
import { getEnv } from "../../../core/env-validation.js";
import { unauthorizedError } from "../../../core/errors.js";

let _jwtSecret: Uint8Array | undefined;

export function getJwtSecret(): Uint8Array {
  return (_jwtSecret ??= new TextEncoder().encode(getEnv().ACCESS_TOKEN_SECRET_KEY));
}

export interface AccessTokenPayload extends JWTPayload {
  userId: string;
  email: string;
  role?: string;
  sid: string;
}

export function generateOpaqueRefreshToken(): string {
  return randomBytes(32).toString("hex");
}

export function hashRefreshToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export async function signAccessToken(payload: {
  userId: string;
  email: string;
  role?: string;
  sid: string;
}): Promise<string> {
  const env = getEnv();
  return await new SignJWT({
    userId: payload.userId,
    email: payload.email,
    role: payload.role,
    sid: payload.sid,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(payload.userId)
    .setIssuedAt()
    .setExpirationTime(`${env.ACCESS_TOKEN_EXPIRE_MINUTES}m`)
    .sign(getJwtSecret());
}

export async function verifyAccessToken(token: string): Promise<AccessTokenPayload> {
  try {
    const { payload } = await jwtVerify(token, getJwtSecret());
    return payload as AccessTokenPayload;
  } catch (err: unknown) {
    throw unauthorizedError("Invalid or expired access token", { cause: err });
  }
}

export function extractBearerToken(c: Context): string | undefined {
  const authHeader = c.req.header("authorization");
  if (authHeader && authHeader.startsWith("Bearer ")) {
    return authHeader.slice(7).trim();
  }
  return getCookie(c, "access_token");
}

export function setAuthCookies(c: Context, accessToken: string): void {
  const env = getEnv();
  setCookie(c, "access_token", accessToken, {
    httpOnly: true,
    secure: env.APP_ENV === "production",
    sameSite: "Lax",
    maxAge: 60 * env.ACCESS_TOKEN_EXPIRE_MINUTES,
  });
}

export function clearAuthCookies(c: Context): void {
  deleteCookie(c, "access_token");
}
