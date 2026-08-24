import { createAuthEndpoint, APIError } from "better-auth/api";
import type { BetterAuthPlugin } from "better-auth";
import { z } from "zod";

/**
 * Custom Better Auth plugin for OTP-verified password change.
 * Ensures an OTP is verified atomically when changing the password of an authenticated user.
 */
export function passwordChangeOtpPlugin(): BetterAuthPlugin {
  return {
    id: "password-change-otp",
    endpoints: {
      changePasswordWithOtp: createAuthEndpoint(
        "/change-password-with-otp",
        {
          method: "POST",
          body: z.object({
            currentPassword: z.string().min(8),
            newPassword: z.string().min(8),
            otp: z.string().length(6),
          }),
        },
        async (ctx) => {
          const session = ctx.context.session;
          if (!session?.user?.email) {
            throw new APIError("UNAUTHORIZED", {
              message: "Authentication session required",
            });
          }

          const otpCheck = await ctx.context.auth.api.checkVerificationOTP({
            body: {
              email: session.user.email,
              type: "email-verification",
              otp: ctx.body.otp,
            },
          });

          if (!otpCheck?.valid) {
            throw new APIError("BAD_REQUEST", {
              message: "Invalid or expired OTP verification code",
            });
          }

          return ctx.context.auth.api.changePassword({
            body: {
              currentPassword: ctx.body.currentPassword,
              newPassword: ctx.body.newPassword,
            },
            headers: ctx.headers,
          });
        }
      ),
    },
  };
}
