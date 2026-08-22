import { SignJWT, jwtVerify, type JWTPayload } from "jose";
import type { Context } from "hono";
import { getCookie, setCookie, deleteCookie } from "hono/cookie";
import { unauthorizedError } from "../../../core/errors.js";

const JWT_SECRET = new TextEncoder().encode(
  process.env.ACCESS_TOKEN_SECRET_KEY || process.env.JWT_SECRET || "super-secret-jwt-key-replace-in-production-12345"
);
const REFRESH_SECRET = new TextEncoder().encode(
  process.env.JWT_REFRESH_SECRET || "super-secret-refresh-key-replace-in-production-12345"
);

export interface JwtPayload extends JWTPayload {
  userId: string;
  email: string;
  role?: string;
}

export async function signAccessToken(payload: JwtPayload): Promise<string> {
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("15m")
    .sign(JWT_SECRET);
}

export async function signRefreshToken(payload: JwtPayload): Promise<string> {
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(REFRESH_SECRET);
}

export async function verifyAccessToken(token: string): Promise<JwtPayload> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload as JwtPayload;
  } catch (err) {
    throw unauthorizedError("Invalid or expired access token", { cause: err });
  }
}

export async function verifyRefreshToken(token: string): Promise<JwtPayload> {
  try {
    const { payload } = await jwtVerify(token, REFRESH_SECRET);
    return payload as JwtPayload;
  } catch (err) {
    throw unauthorizedError("Invalid or expired refresh token", { cause: err });
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
  setCookie(c, "access_token", accessToken, {
    httpOnly: true,
    secure: process.env.APP_ENV === "production",
    sameSite: "Lax",
    maxAge: 60 * 15,
  });
}

export function clearAuthCookies(c: Context): void {
  deleteCookie(c, "access_token");
}
