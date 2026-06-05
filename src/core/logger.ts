import pino from "pino";
import env from "./env.js";

const isPrettyLoggingEnabled = env.APP_ENV === "development" && !process.env.VERCEL;

export const logger = pino({
  level: env.LOG_LEVEL,

  base: {
    service: "my-api",
    env: env.APP_ENV,
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
});
