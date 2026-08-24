import { Client } from "@upstash/qstash";
import { getEnv } from "../core/env-validation.js";

let _client: Client | undefined;

export function getQStash(): Client {
  return (_client ??= new Client({ token: getEnv().QSTASH_TOKEN }));
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
