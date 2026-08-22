import { NodeSDK } from "@opentelemetry/sdk-node";
import { getNodeAutoInstrumentations } from "@opentelemetry/auto-instrumentations-node";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import { OTLPMetricExporter } from "@opentelemetry/exporter-metrics-otlp-http";
import { PeriodicExportingMetricReader } from "@opentelemetry/sdk-metrics";

let _isInitialized = false;
let sdk: NodeSDK | null = null;

export function initializeInstrumentation(): void {
  if (_isInitialized) return;

  const traceExporter = new OTLPTraceExporter({
    url: process.env.OTEL_EXPORTER_OTLP_TRACES_ENDPOINT || "http://localhost:4318/v1/traces",
  });

  const metricReader = new PeriodicExportingMetricReader({
    exporter: new OTLPMetricExporter({
      url: process.env.OTEL_EXPORTER_OTLP_METRICS_ENDPOINT || "http://localhost:4318/v1/metrics",
    }),
    exportIntervalMillis: 60000,
  });

  sdk = new NodeSDK({
    serviceName: process.env.OTEL_SERVICE_NAME || "api",
    traceExporter,
    metricReader,
    instrumentations: [getNodeAutoInstrumentations()],
  });

  sdk.start();
  _isInitialized = true;

  process.on("SIGTERM", () => {
    sdk?.shutdown().finally(() => process.exit(0));
  });
}

export function isInstrumentationInitialized(): boolean {
  return _isInitialized;
}
