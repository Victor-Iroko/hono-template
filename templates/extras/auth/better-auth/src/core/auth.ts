import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "../db/client.js";

type AuthInstance = ReturnType<typeof betterAuth>;
let _auth: AuthInstance | undefined;

export function getAuth(): AuthInstance {
  if (!_auth) {
    _auth = betterAuth({
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
    });
  }
  return _auth;
}

export const auth = new Proxy({} as AuthInstance, {
  get(_target, prop: string | symbol, receiver: unknown) {
    const target = getAuth();
    const value = Reflect.get(target, prop, receiver);
    return typeof value === "function" ? (value as (...args: unknown[]) => unknown).bind(target) : value;
  },
  has(_target, prop: string | symbol) {
    return Reflect.has(getAuth(), prop);
  },
  ownKeys(_target) {
    return Reflect.ownKeys(getAuth());
  },
  getOwnPropertyDescriptor(_target, prop: string | symbol) {
    return Reflect.getOwnPropertyDescriptor(getAuth(), prop);
  },
});
