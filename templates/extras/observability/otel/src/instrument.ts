import { NodeSDK } from "@opentelemetry/sdk-node";
import { getNodeAutoInstrumentations } from "@opentelemetry/auto-instrumentations-node";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import { OTLPMetricExporter } from "@opentelemetry/exporter-metrics-otlp-http";
import { PeriodicExportingMetricReader } from "@opentelemetry/sdk-metrics";
import { env } from "./core/env-validation.js";

let sdk: NodeSDK | null = null;

export function initializeInstrumentation(): void {
  if (sdk) return;

  const traceExporter = new OTLPTraceExporter({
    url: env.OTEL_EXPORTER_OTLP_TRACES_ENDPOINT,
  });

  const metricReader = new PeriodicExportingMetricReader({
    exporter: new OTLPMetricExporter({
      url: env.OTEL_EXPORTER_OTLP_METRICS_ENDPOINT,
    }),
    exportIntervalMillis: 60000,
  });

  sdk = new NodeSDK({
    serviceName: env.OTEL_SERVICE_NAME,
    traceExporter,
    metricReader,
    instrumentations: [getNodeAutoInstrumentations()],
  });

  sdk.start();

  process.on("SIGTERM", () => {
    sdk?.shutdown().finally(() => process.exit(0));
  });
}

export function isInstrumentationInitialized(): boolean {
  return sdk !== null;
}
