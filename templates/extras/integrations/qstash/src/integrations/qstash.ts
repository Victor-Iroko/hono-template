import { Client } from "@upstash/qstash";

let qstashClient: Client | null = null;

export function getQStash(): Client {
  if (!qstashClient) {
    const token = process.env.QSTASH_TOKEN || "mock_qstash_token";
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
