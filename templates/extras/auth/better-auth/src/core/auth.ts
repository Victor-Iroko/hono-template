import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { getDb } from "../db/client.js";

export type Auth = ReturnType<typeof betterAuth>;
let _auth: Auth | undefined;

export function getAuth(): Auth {
  if (_auth) return _auth;

  return (_auth = betterAuth({
    database: drizzleAdapter(getDb(), {
      provider: "pg",
    }),
    emailAndPassword: {
      enabled: true,
    },
    session: {
      expiresIn: 60 * 60 * 24 * 7, // 7 days
      updateAge: 60 * 60 * 24, // 1 day
    },
  }));
}
