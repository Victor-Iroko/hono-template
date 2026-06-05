import "./core/env.js";
import "./instrument.js";

import { Hono } from "hono";
import { cors } from "hono/cors";
import { describeRoute, openAPIRouteHandler, resolver } from "hono-openapi";
import { Scalar } from "@scalar/hono-api-reference";
import { createMarkdownFromOpenApi } from "@scalar/openapi-to-markdown";

import { globalRatelimit } from "./core/rate-limiter.js";
import { onErrorHandler } from "./core/error-handlers.js";
import { requestLifecycle } from "./middleware/request-context.js";
import v1Router from "./api/v1/router.js";
import { auth } from "./utils/auth.js";
import type { Logger } from "pino";
import { z } from "zod";
import env from "./core/env.js";
import { openapiDocumentation } from "./core/openapi-config.js";

export type Variables = {
  requestId: string;
  correlationId: string;
  logger: Logger;
  user?: typeof auth.$Infer.Session.user | null;
  session?: typeof auth.$Infer.Session.session | null;
};

const app = new Hono<{ Variables: Variables }>();

app.use(requestLifecycle);

app.use(globalRatelimit);

app.use(
  "/api/auth/*",
  cors({
    origin: env.BETTER_AUTH_URL,
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["POST", "GET", "OPTIONS"],
    credentials: true,
  }),
);

app.on(["POST", "GET"], "/api/auth/*", (c) => auth.handler(c.req.raw));

if (env.APP_ENV !== "production" || process.env.VERCEL) {
  app.get(
    "/openapi",
    openAPIRouteHandler(app, {
      documentation: openapiDocumentation,
    }),
  );

  app.get(
    "/docs",
    Scalar({
      url: "/openapi",
      pageTitle: "API Docs",
      theme: "default",
      proxyUrl: "https://proxy.scalar.com",
      authentication: {
        preferredSecurityScheme: "bearerAuth",
        securitySchemes: {
          bearerAuth: {
            token: "",
          },
        },
      },
    }),
  );

  app.get("/llms.txt", async (c) => {
    const response = await fetch(`${c.req.url.split("/llms.txt")[0]}/openapi`);
    const openapiJson = await response.json();
    const markdown = await createMarkdownFromOpenApi(JSON.stringify(openapiJson));
    return c.text(markdown);
  });
}

app.onError(onErrorHandler);

app.notFound((c) => {
  return c.json(
    {
      error: { code: "not_found", message: "Not Found", path: c.req.path },
    },
    404,
  );
});

const healthResponseSchema = z.object({ status: z.string() });
app.get(
  "/health",
  describeRoute({
    tags: ["Health"],
    summary: "Health check",
    security: [],
    responses: {
      200: {
        description: "Server is healthy",
        content: {
          "application/json": { schema: resolver(healthResponseSchema) },
        },
      },
    },
  }),
  (c) => c.json({ status: "ok" }),
);

app.route("/api/v1", v1Router);

export default app;
