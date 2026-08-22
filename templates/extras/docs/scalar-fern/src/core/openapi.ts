import type { Hono } from "hono";
import { apiReference } from "@scalar/hono-api-reference";

export function setupOpenApiDocs(app: Hono): void {
  app.get(
    "/docs",
    apiReference({
      spec: {
        url: "/openapi.json",
      },
      pageTitle: "API Documentation",
      theme: "saturn",
      authentication: {
        preferredSecurityScheme: "bearerAuth",
        securitySchemes: {
          bearerAuth: {
            token: "",
          },
        },
      },
    })
  );

  app.get(
    "/reference",
    apiReference({
      spec: {
        url: "/openapi.json",
      },
      pageTitle: "API Reference",
      theme: "saturn",
    })
  );

  app.get("/openapi.json", (c) => {
    return c.json({
      openapi: "3.1.0",
      info: {
        title: "API Reference",
        version: "1.0.0",
        description: "API Documentation generated with OpenAPI and Scalar",
      },
      paths: {
        "/api/v1/health": {
          get: {
            summary: "Health Check",
            description: "Returns current server health and uptime",
            responses: {
              "200": {
                description: "Successful response",
                content: {
                  "application/json": {
                    schema: {
                      type: "object",
                      properties: {
                        status: { type: "string", example: "ok" },
                        timestamp: { type: "string" },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });
  });

  app.get("/llms.txt", (c) => {
    return c.text("# API Documentation for AI Models\n\n- GET /api/v1/health: Health check endpoint");
  });
}
