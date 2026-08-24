import { envSchema, type Env } from "./env-schema.js";

let isValidated = false;
let _env: Env | undefined;

export function initEnv(bindings: Record<string, unknown> = {}): Env {
  if (isValidated && _env) return _env;

  const result = envSchema.safeParse(bindings);
  if (!result.success) {
    console.error("❌ Environment validation failed:", result.error.format());
    throw new Error("Environment validation failed");
  }

  _env = result.data;
  isValidated = true;
  return _env;
}

export function getEnv(): Env {
  if (!_env) {
    return initEnv();
  }
  return _env;
}

export const env = new Proxy({} as Env, {
  get: (_, prop: string | symbol, receiver: unknown) => {
    return Reflect.get(getEnv(), prop, receiver);
  },
  has: (_, prop: string | symbol) => {
    return Reflect.has(getEnv(), prop);
  },
  ownKeys: () => {
    return Reflect.ownKeys(getEnv());
  },
  getOwnPropertyDescriptor: (_, prop: string | symbol) => {
    return Reflect.getOwnPropertyDescriptor(getEnv(), prop);
  },
});

export default env;
