import pino, { type Logger } from "pino";
import { env } from "./env-validation.js";

let _logger: Logger | undefined;

export function getLogger(): Logger {
  if (_logger) return _logger;

  const isPrettyLoggingEnabled = env.APP_ENV === "development" && !process.env.VERCEL;

  return (_logger = pino({
    level: env.LOG_LEVEL || "info",
    base: {
      service: "api",
      env: env.APP_ENV || "development",
    },
    timestamp: pino.stdTimeFunctions.isoTime,
    redact: {
      paths: [
        "req.headers.authorization",
        "req.headers.cookie",
        "req.headers['set-cookie']",
        "*.password",
        "*.token",
        "*.accessToken",
        "*.refreshToken",
        "*.secret",
        "*.apiKey",
      ],
      censor: "[REDACTED]",
    },
    serializers: {
      err: pino.stdSerializers.err,
    },
    ...(isPrettyLoggingEnabled
      ? {
          transport: {
            target: "pino-pretty",
            options: {
              colorize: true,
              translateTime: "SYS:standard",
              ignore: "pid,hostname,service,env",
            },
          },
        }
      : {}),
  }));
}

export const initLogger = getLogger;

export const logger = new Proxy({} as Logger, {
  get(_, prop: string | symbol, receiver: unknown) {
    const target = getLogger();
    const value = Reflect.get(target, prop, receiver);
    return typeof value === "function" ? (value as (...args: unknown[]) => unknown).bind(target) : value;
  },
  has: (_, prop: string | symbol) => Reflect.has(getLogger(), prop),
  ownKeys: () => Reflect.ownKeys(getLogger()),
  getOwnPropertyDescriptor: (_, prop: string | symbol) => Reflect.getOwnPropertyDescriptor(getLogger(), prop),
});

export default logger;
