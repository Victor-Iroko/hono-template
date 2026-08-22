import { expect } from "vitest";
import { z } from "zod";
import app from "../src/index.js";

export interface ApiOptions {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  token?: string;
  body?: unknown;
  headers?: Record<string, string>;
}

export interface ApiResponse {
  status: number;
  body: unknown;
  headers: Headers;
  text: string;
}

export async function api(path: string, options: ApiOptions = {}): Promise<ApiResponse> {
  const { method = "GET", token, body, headers = {} } = options;

  const res = await app.request(path, {
    method,
    headers: {
      ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  const text = await res.text();
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    parsed = undefined;
  }

  return { status: res.status, body: parsed, headers: res.headers, text };
}

export function expectApiData<S extends z.ZodTypeAny>(schema: S, body: unknown): z.infer<S> {
  expect(body).toMatchObject({ success: true });
  const payload = (body as { data?: unknown }).data;
  const result = schema.safeParse(payload);
  if (!result.success) {
    expect.fail(`Response does not match schema: ${JSON.stringify(result.error.issues, null, 2)}`);
  }
  return result.data as z.infer<S>;
}

export function expectError(body: unknown, code: string) {
  expect(body).toMatchObject({ error: { code } });
}
