import { envSchema, type Env } from "./env-schema.js";

let isValidated = false;
let _env: Env | undefined;

export function validateEnv(): Env {
  if (isValidated && _env) return _env;

  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    console.error("❌ Environment validation failed:", result.error.format());
    process.exit(1);
  }

  _env = result.data;
  isValidated = true;
  return _env;
}

export function getEnv(): Env {
  if (!_env) {
    return validateEnv();
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
