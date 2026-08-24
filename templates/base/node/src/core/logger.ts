import pino, { type Logger } from "pino";
import { getEnv } from "./env-validation.js";

let _logger: Logger | undefined;

export function getLogger(): Logger {
  if (_logger) return _logger;

  const env = getEnv();
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
export type { Logger };
