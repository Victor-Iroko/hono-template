import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "../db/client.js";

type AuthInstance = ReturnType<typeof betterAuth>;
let _auth: AuthInstance | undefined;

export function getAuth(): AuthInstance {
  if (_auth) return _auth;

  return (_auth = betterAuth({
    database: drizzleAdapter(db, {
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

export const auth = new Proxy({} as AuthInstance, {
  get(_, prop: string | symbol, receiver: unknown) {
    const target = getAuth();
    const value = Reflect.get(target, prop, receiver);
    return typeof value === "function" ? (value as (...args: unknown[]) => unknown).bind(target) : value;
  },
  has: (_, prop: string | symbol) => Reflect.has(getAuth(), prop),
  ownKeys: () => Reflect.ownKeys(getAuth()),
  getOwnPropertyDescriptor: (_, prop: string | symbol) => Reflect.getOwnPropertyDescriptor(getAuth(), prop),
});
