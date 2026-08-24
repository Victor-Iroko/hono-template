import { Client } from "@upstash/qstash";
import { getEnv } from "../core/env-validation.js";

export type SendEmailJobRequest = {
  to: string | string[];
  subject: string;
  html?: string;
  text?: string;
};

let _client: Client | undefined;

export function getQStash(): Client {
  return (_client ??= new Client({ token: getEnv().QSTASH_TOKEN }));
}

export function getBaseUrl(): string {
  const env = getEnv() as Record<string, unknown>;
  const rawUrl = (env.DEPLOYMENT_URL as string | undefined) || (env.BETTER_AUTH_URL as string | undefined) || "http://localhost:3000";
  return rawUrl.replace(/\/+$/, "");
}

export async function publishJob<T extends Record<string, unknown>>(
  destinationUrl: string,
  body: T,
  delaySeconds?: number,
  retries = 3
): Promise<{ messageId: string }> {
  const client = getQStash();
  const response = await client.publishJSON({
    url: destinationUrl,
    body,
    delay: delaySeconds,
    retries,
  });

  return { messageId: response.messageId };
}

export async function publishSendEmail(params: SendEmailJobRequest): Promise<{ messageId: string }> {
  const baseUrl = getBaseUrl();
  const client = getQStash();
  const response = await client.publishJSON({
    url: `${baseUrl}/api/v1/jobs/send-email`,
    body: params,
  });
  return { messageId: response.messageId };
}
