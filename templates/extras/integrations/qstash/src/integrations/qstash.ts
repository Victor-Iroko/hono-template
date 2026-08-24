import { Client } from "@upstash/qstash";
import { env } from "../core/env-validation.js";

let qstashClient: Client | null = null;

export function getQStash(): Client {
  if (!qstashClient) {
    const token = env.QSTASH_TOKEN;
    qstashClient = new Client({ token });
  }
  return qstashClient;
}

export async function publishJob<T extends Record<string, unknown>>(
  destinationUrl: string,
  body: T,
  delaySeconds?: number
): Promise<{ messageId: string }> {
  const client = getQStash();
  const response = await client.publishJSON({
    url: destinationUrl,
    body,
    delay: delaySeconds,
  });

  return { messageId: response.messageId };
}
