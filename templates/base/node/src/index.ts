import { Hono } from "hono";
import { onErrorHandler } from "./core/error-handlers.js";
import { requestLifecycle } from "./middleware/request-context.middleware.js";
import { v1Router } from "./api/v1/router.js";
import type { RequestContext } from "./core/request-context.js";
// [INSTALLER:IMPORTS]

// [INSTALLER:VARIABLES_START]
export type Variables = RequestContext & {
  user?: unknown;
};
// [INSTALLER:VARIABLES_END]

const app = new Hono<{ Variables: Variables }>();

// Request lifecycle: IDs, correlationId, ALS, logging, timing
app.use(requestLifecycle);
// [INSTALLER:MIDDLEWARE]

// API Routes
app.route("/api/v1", v1Router);
// [INSTALLER:ROUTES]

// Global error & 404 handlers
app.onError(onErrorHandler);
app.notFound((c) => {
  return c.json(
    {
      error: {
        code: "not_found",
        message: "Not Found",
        path: c.req.path,
      },
    },
    404
  );
});

export default app;
