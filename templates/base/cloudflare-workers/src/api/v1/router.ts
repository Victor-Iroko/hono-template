import { Hono } from "hono";

export const v1Router = new Hono();

v1Router.get("/health", (c) => {
  return c.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    environment: "cloudflare-workers",
  });
});
