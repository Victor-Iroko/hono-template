import { z } from "zod";

export const loginSchema = z.object({
  email: z.email(),
  password: z.string().min(6),
});

export const registerSchema = z.object({
  email: z.email(),
  password: z.string().min(6),
  name: z.string().min(1).optional(),
});

export const refreshSchema = z.object({
  refreshToken: z.string().min(1),
});

export const logoutSchema = z.object({
  refreshToken: z.string().optional(),
});

export const verifyOtpSchema = z.object({
  email: z.string().email(),
  otp: z.string().min(6).max(6),
});

export const resendOtpSchema = z.object({
  email: z.string().email(),
});

export const googleAuthSchema = z.object({
  idToken: z.string().min(1),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email(),
});

export const resetPasswordSchema = z.object({
  email: z.string().email(),
  otp: z.string().min(6).max(6),
  newPassword: z.string().min(6),
});

export const requestPasswordChangeOtpSchema = z.object({
  email: z.string().email().optional(),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(6),
  newPassword: z.string().min(6),
  otp: z.string().min(6).max(6),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type RefreshInput = z.infer<typeof refreshSchema>;
export type LogoutInput = z.infer<typeof logoutSchema>;
export type VerifyOtpInput = z.infer<typeof verifyOtpSchema>;
export type ResendOtpInput = z.infer<typeof resendOtpSchema>;
export type GoogleAuthInput = z.infer<typeof googleAuthSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type RequestPasswordChangeOtpInput = z.infer<typeof requestPasswordChangeOtpSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
