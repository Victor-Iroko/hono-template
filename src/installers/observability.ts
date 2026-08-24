import { join } from "node:path";
import type { InstallerContext } from "./types.js";
import { copyTemplateDir } from "../utils/fs.js";
import { mergePackageJson } from "../utils/pkg-json.js";
import { appendEnvVars } from "../utils/env.js";
import { injectAtMarker, prependImports } from "../utils/injector.js";

export async function installObservability(ctx: InstallerContext): Promise<void> {
  const { observability } = ctx.options;
  if (observability === "none") {
    return;
  }

  if (observability === "otel") {
    const sourceDir = join(ctx.templateRoot, "extras", "observability", "otel");
    await copyTemplateDir(sourceDir, ctx.projectDir);

    await mergePackageJson(ctx.projectDir, {
      dependencies: {
        "@opentelemetry/api": "^1.9.0",
        "@opentelemetry/auto-instrumentations-node": "^0.56.0",
        "@opentelemetry/exporter-metrics-otlp-http": "^0.57.2",
        "@opentelemetry/exporter-trace-otlp-http": "^0.57.2",
        "@opentelemetry/sdk-metrics": "^1.30.1",
        "@opentelemetry/sdk-node": "^0.57.2",
      },
    });

    await appendEnvVars(ctx.projectDir, {
      env: {
        OTEL_SERVICE_NAME: ctx.options.projectName,
        OTEL_EXPORTER_OTLP_TRACES_ENDPOINT: "http://localhost:4318/v1/traces",
        OTEL_EXPORTER_OTLP_METRICS_ENDPOINT: "http://localhost:4318/v1/metrics",
      },
      example: {
        OTEL_SERVICE_NAME: "hono-service",
        OTEL_EXPORTER_OTLP_TRACES_ENDPOINT: "http://localhost:4318/v1/traces",
        OTEL_EXPORTER_OTLP_METRICS_ENDPOINT: "http://localhost:4318/v1/metrics",
      },
      comments: ["OpenTelemetry Observability"],
    });

    await injectAtMarker(
      ctx.projectDir,
      "src/core/env-schema.ts",
      "// [INSTALLER:ENV_SCHEMA]",
      `  OTEL_SERVICE_NAME: z.string().default("${ctx.options.projectName}"),
  OTEL_EXPORTER_OTLP_TRACES_ENDPOINT: z.string().default("http://localhost:4318/v1/traces"),
  OTEL_EXPORTER_OTLP_METRICS_ENDPOINT: z.string().default("http://localhost:4318/v1/metrics"),`
    );

    await prependImports(
      ctx.projectDir,
      "src/index.ts",
      'import { initInstrumentation } from "./instrument.js";\ninitInstrumentation();'
    );
  } else if (observability === "sentry") {
    const sourceDir = join(ctx.templateRoot, "extras", "observability", "sentry");
    await copyTemplateDir(sourceDir, ctx.projectDir);

    await mergePackageJson(ctx.projectDir, {
      dependencies: {
        "@sentry/node": "^8.55.0",
        "@sentry/hono": "^8.55.0",
      },
    });

    await appendEnvVars(ctx.projectDir, {
      env: {
        SENTRY_DSN: "",
      },
      example: {
        SENTRY_DSN: "",
      },
      comments: ["Sentry Error Tracking"],
    });

    await injectAtMarker(
      ctx.projectDir,
      "src/core/env-schema.ts",
      "// [INSTALLER:ENV_SCHEMA]",
      `  SENTRY_DSN: z.string().optional(),`
    );

    await prependImports(
      ctx.projectDir,
      "src/index.ts",
      'import { initInstrumentation } from "./instrument.js";\ninitInstrumentation();'
    );

    await injectAtMarker(
      ctx.projectDir,
      "src/index.ts",
      "// [INSTALLER:IMPORTS]",
      'import { sentryMiddleware } from "./core/sentry.js";'
    );

    await injectAtMarker(
      ctx.projectDir,
      "src/index.ts",
      "// [INSTALLER:MIDDLEWARE]",
      'app.use("*", sentryMiddleware);'
    );
  }
}
