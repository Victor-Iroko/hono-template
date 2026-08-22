import { Hono } from "hono";
// [INSTALLER:V1_IMPORTS]

export const v1Router = new Hono();

v1Router.get("/health", (c) => {
  return c.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// [INSTALLER:V1_ROUTES]
