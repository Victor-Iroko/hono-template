import { randomInt, createHash, randomUUID } from "node:crypto";
import { badRequestError } from "../../../core/errors.js";

export interface OtpRecord {
  id: string;
  email: string;
  otpHash: string;
  type: "email-verification" | "password-reset" | "password-change";
  attempts: number;
  maxAttempts: number;
  expiresAt: Date;
  createdAt: Date;
}

const OTP_EXPIRY_MINUTES = 10;
const MAX_ATTEMPTS = 3;

// In-memory store for OTP records and user email verification states
const otpStore = new Map<string, OtpRecord>();
const verifiedEmails = new Set<string>();

export function generateNumericOtp(length = 6): string {
  const min = Math.pow(10, length - 1);
  const max = Math.pow(10, length) - 1;
  return randomInt(min, max + 1).toString();
}

export function hashOtp(otp: string): string {
  return createHash("sha256").update(otp.trim()).digest("hex");
}

function getOtpKey(email: string, type: string): string {
  return `${email.toLowerCase().trim()}:${type}`;
}

export async function createEmailOtp(
  email: string,
  type: "email-verification" | "password-reset" | "password-change" = "email-verification"
): Promise<{ otp: string; expiresAt: Date }> {
  const normalizedEmail = email.toLowerCase().trim();
  const rawOtp = generateNumericOtp(6);
  const otpHash = hashOtp(rawOtp);
  const now = new Date();
  const expiresAt = new Date(now.getTime() + OTP_EXPIRY_MINUTES * 60 * 1000);

  const record: OtpRecord = {
    id: randomUUID(),
    email: normalizedEmail,
    otpHash,
    type,
    attempts: 0,
    maxAttempts: MAX_ATTEMPTS,
    expiresAt,
    createdAt: now,
  };

  otpStore.set(getOtpKey(normalizedEmail, type), record);

  return { otp: rawOtp, expiresAt };
}

export async function verifyEmailOtp(
  email: string,
  presentedOtp: string,
  type: "email-verification" | "password-reset" | "password-change" = "email-verification"
): Promise<boolean> {
  const normalizedEmail = email.toLowerCase().trim();
  const key = getOtpKey(normalizedEmail, type);
  const record = otpStore.get(key);

  if (!record) {
    throw badRequestError("No OTP verification code requested for this email");
  }

  if (record.expiresAt.getTime() < Date.now()) {
    otpStore.delete(key);
    throw badRequestError("OTP has expired. Please request a new code.");
  }

  if (record.attempts >= record.maxAttempts) {
    otpStore.delete(key);
    throw badRequestError("Too many invalid attempts. Please request a new OTP.");
  }

  record.attempts += 1;
  const presentedHash = hashOtp(presentedOtp);

  if (presentedHash !== record.otpHash) {
    const remaining = record.maxAttempts - record.attempts;
    if (remaining <= 0) {
      otpStore.delete(key);
      throw badRequestError("Invalid OTP. Maximum attempts exceeded. Please request a new code.");
    }
    throw badRequestError(`Invalid OTP code. ${remaining} attempt(s) remaining.`);
  }

  // Verification succeeded
  otpStore.delete(key);
  if (type === "email-verification") {
    verifiedEmails.add(normalizedEmail);
  }

  return true;
}

export function isEmailVerified(email: string): boolean {
  return verifiedEmails.has(email.toLowerCase().trim());
}

export function setEmailVerified(email: string, verified: boolean): void {
  const normalized = email.toLowerCase().trim();
  if (verified) {
    verifiedEmails.add(normalized);
  } else {
    verifiedEmails.delete(normalized);
  }
}

export function cleanupExpiredOtps(): number {
  const now = Date.now();
  let cleaned = 0;
  for (const [key, record] of otpStore.entries()) {
    if (record.expiresAt.getTime() <= now) {
      otpStore.delete(key);
      cleaned++;
    }
  }
  return cleaned;
}
