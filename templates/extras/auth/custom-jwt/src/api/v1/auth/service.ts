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
import {
  createEmailOtp,
  verifyEmailOtp,
  isEmailVerified,
  setEmailVerified,
} from "./otp.js";
import { logSecurityAudit } from "./audit.js";
import type { LoginInput, RegisterInput, VerifyOtpInput, ResendOtpInput } from "./schemas.js";
import { unauthorizedError, badRequestError } from "../../../core/errors.js";
import { sendTemplatedEmail } from "../../../integrations/email/email-templates.js";

// Demo user storage for Custom JWT auth simulation
const registeredUsers = new Map<string, SessionUser & { emailVerified: boolean }>();

// Pre-populate demo user as verified for initial access
registeredUsers.set("demo@example.com", {
  id: "demo-user-id-12345",
  email: "demo@example.com",
  name: "Demo User",
  role: "user",
  emailVerified: true,
});
setEmailVerified("demo@example.com", true);

export async function loginUser(input: LoginInput, meta?: ClientMeta) {
  const normalizedEmail = input.email.toLowerCase().trim();
  const user = registeredUsers.get(normalizedEmail) ?? {
    id: "demo-user-id-12345",
    email: normalizedEmail,
    name: "Demo User",
    role: "user",
    emailVerified: isEmailVerified(normalizedEmail),
  };

  if (!isEmailVerified(normalizedEmail) && !user.emailVerified) {
    throw unauthorizedError("Email not verified. Please verify your OTP before logging in.");
  }

  const { tokens } = await upsertUserSession(user, meta);
  return { user, tokens };
}

async function dispatchOtpEmail(email: string, otp: string, type = "email-verification"): Promise<void> {
  const templateName = type === "password-reset" ? "password_reset" : "email_verification";
  await sendTemplatedEmail(email, templateName, { otp });
}

export async function registerUser(input: RegisterInput, meta?: ClientMeta) {
  const normalizedEmail = input.email.toLowerCase().trim();
  const userId = crypto.randomUUID();

  const user: SessionUser & { emailVerified: boolean } = {
    id: userId,
    email: normalizedEmail,
    name: input.name ?? "New User",
    role: "user",
    emailVerified: false,
  };

  registeredUsers.set(normalizedEmail, user);
  setEmailVerified(normalizedEmail, false);

  const { otp, expiresAt } = await createEmailOtp(normalizedEmail, "email-verification");

  await logSecurityAudit(userId, "otp_generated", meta?.ipAddress, {
    email: normalizedEmail,
    type: "email-verification",
  });

  await dispatchOtpEmail(normalizedEmail, otp, "email-verification");

  return {
    message: "Registration successful. Please verify the OTP sent to your email.",
    email: normalizedEmail,
    expiresAt,
  };
}

export async function verifyUserEmailOtp(input: VerifyOtpInput, meta?: ClientMeta) {
  const normalizedEmail = input.email.toLowerCase().trim();
  await verifyEmailOtp(normalizedEmail, input.otp, "email-verification");

  let user = registeredUsers.get(normalizedEmail);
  if (user) {
    user.emailVerified = true;
  } else {
    user = {
      id: crypto.randomUUID(),
      email: normalizedEmail,
      name: "Verified User",
      role: "user",
      emailVerified: true,
    };
    registeredUsers.set(normalizedEmail, user);
  }

  await logSecurityAudit(user.id, "email_verified", meta?.ipAddress, {
    email: normalizedEmail,
  });

  const { tokens } = await upsertUserSession(user, meta);
  return {
    user,
    tokens,
    message: "Email verified successfully.",
  };
}

export async function resendUserEmailOtp(input: ResendOtpInput, meta?: ClientMeta) {
  const normalizedEmail = input.email.toLowerCase().trim();
  if (isEmailVerified(normalizedEmail)) {
    throw badRequestError("Email is already verified. Please proceed to login.");
  }

  const { otp, expiresAt } = await createEmailOtp(normalizedEmail, "email-verification");

  const existingUser = registeredUsers.get(normalizedEmail);
  if (existingUser) {
    await logSecurityAudit(existingUser.id, "otp_generated", meta?.ipAddress, {
      email: normalizedEmail,
      type: "email-verification",
    });
  }

  await dispatchOtpEmail(normalizedEmail, otp, "email-verification");

  return {
    success: true,
    message: "A new verification OTP has been sent to your email.",
    expiresAt,
  };
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

export async function requestForgotPasswordOtp(input: { email: string }, meta?: ClientMeta) {
  const normalizedEmail = input.email.toLowerCase().trim();
  const { otp, expiresAt } = await createEmailOtp(normalizedEmail, "password-reset");

  const existingUser = registeredUsers.get(normalizedEmail);
  if (existingUser) {
    await logSecurityAudit(existingUser.id, "otp_generated", meta?.ipAddress, {
      email: normalizedEmail,
      type: "password-reset",
    });
  }

  await dispatchOtpEmail(normalizedEmail, otp, "password-reset");

  return {
    success: true,
    message: "If an account exists with this email, a password reset OTP has been sent.",
    expiresAt,
  };
}

export async function resetPasswordWithOtp(
  input: { email: string; otp: string; newPassword: string },
  meta?: ClientMeta
) {
  const normalizedEmail = input.email.toLowerCase().trim();
  await verifyEmailOtp(normalizedEmail, input.otp, "password-reset");

  const user = registeredUsers.get(normalizedEmail);
  if (user) {
    await logSecurityAudit(user.id, "password_reset", meta?.ipAddress, {
      email: normalizedEmail,
    });
    await revokeAllUserSessions(user.id);
  }

  return {
    success: true,
    message: "Password reset successfully. Please log in with your new password.",
  };
}

export async function requestPasswordChangeOtp(email: string, userId?: string, meta?: ClientMeta) {
  const normalizedEmail = email.toLowerCase().trim();
  const { otp, expiresAt } = await createEmailOtp(normalizedEmail, "password-change");

  if (userId) {
    await logSecurityAudit(userId, "otp_generated", meta?.ipAddress, {
      email: normalizedEmail,
      type: "password-change",
    });
  }

  await dispatchOtpEmail(normalizedEmail, otp, "password-reset");

  return {
    success: true,
    message: "A verification OTP has been sent to your email to confirm the password change.",
    expiresAt,
  };
}

export async function changePasswordWithOtp(
  userId: string,
  email: string,
  input: { currentPassword: string; newPassword: string; otp: string },
  meta?: ClientMeta
) {
  const normalizedEmail = email.toLowerCase().trim();
  await verifyEmailOtp(normalizedEmail, input.otp, "password-change");

  await logSecurityAudit(userId, "password_changed", meta?.ipAddress, {
    email: normalizedEmail,
  });

  return {
    success: true,
    message: "Password changed successfully.",
  };
}
