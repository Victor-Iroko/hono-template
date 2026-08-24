import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { emailOTP } from "better-auth/plugins";
import { getDb } from "../db/client.js";
import { getEnv } from "../core/env-validation.js";
import { sendTemplatedEmail } from "../integrations/email/email-templates.js";
import { passwordChangeOtpPlugin } from "./auth-plugins.js";

export const auth = betterAuth({
  database: drizzleAdapter(getDb(), {
    provider: "pg",
  }),
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
  },
  session: {
    expiresIn: getEnv().AUTH_SESSION_EXPIRES_IN,
    updateAge: getEnv().AUTH_SESSION_UPDATE_AGE,
  },
  plugins: [
    emailOTP({
      async sendVerificationOTP({ email, otp, type }) {
        const templateName = type === "forget-password" ? "password_reset" : "email_verification";
        await sendTemplatedEmail(email, templateName, { otp });
      },
      sendVerificationOnSignUp: true,
      overrideDefaultEmailVerification: true,
    }),
    passwordChangeOtpPlugin(),
  ],
});

export type Auth = typeof auth;
export const getAuth = (): Auth => auth;
