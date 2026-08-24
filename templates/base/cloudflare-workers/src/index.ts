import { Hono } from "hono";
import { errorHandler, notFoundHandler } from "./core/error-handlers.js";
import { initEnv } from "./core/env-validation.js";
import { v1Router } from "./api/v1/router.js";
// [INSTALLER:IMPORTS]

export interface Bindings {
  [key: string]: unknown;
}

const app = new Hono<{ Bindings: Bindings }>();

// Seed and validate environment bindings on each request
app.use("*", async (c, next) => {
  initEnv(c.env as Record<string, unknown>);
  await next();
});

// Global Middleware
// [INSTALLER:MIDDLEWARE]

// Routes
app.route("/api/v1", v1Router);
// [INSTALLER:ROUTES]

// Error Handlers
app.notFound(notFoundHandler);
app.onError(errorHandler);

export default app;
