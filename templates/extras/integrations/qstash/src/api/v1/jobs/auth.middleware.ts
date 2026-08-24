import type { Context, Next } from "hono";
import { Receiver } from "@upstash/qstash";
import { getEnv } from "../../../core/env-validation.js";
import { unauthorizedError } from "../../../core/errors.js";

let _receiver: Receiver | undefined;

function getReceiver(): Receiver | null {
  const env = getEnv() as Record<string, unknown>;
  const currentSigningKey = env.QSTASH_CURRENT_SIGNING_KEY as string | undefined;
  const nextSigningKey = env.QSTASH_NEXT_SIGNING_KEY as string | undefined;

  if (!currentSigningKey || !nextSigningKey) {
    return null;
  }

  return (_receiver ??= new Receiver({
    currentSigningKey,
    nextSigningKey,
  }));
}

export async function qstashAuth(c: Context, next: Next) {
  const env = getEnv() as Record<string, unknown>;
  if (env.NODE_ENV === "test" || process.env.NODE_ENV === "test" || process.env.QSTASH_DEV === "true") {
    await next();
    return;
  }

  const receiver = getReceiver();
  if (!receiver) {
    // If keys not configured in local dev, allow request to proceed
    await next();
    return;
  }

  const signature = c.req.raw.headers.get("upstash-signature") ?? "";
  const body = await c.req.raw.clone().text();

  try {
    const isValid = await receiver.verify({ signature, body, url: c.req.url });
    if (!isValid) {
      throw unauthorizedError("Invalid QStash signature");
    }
  } catch {
    throw unauthorizedError("Invalid QStash signature");
  }

  await next();
}
