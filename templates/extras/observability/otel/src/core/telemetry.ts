import { trace, metrics, type Tracer, type Meter } from "@opentelemetry/api";
import { getEnv } from "./env-validation.js";

let _tracer: Tracer | undefined;
let _meter: Meter | undefined;

export function getTracer(): Tracer {
  return (_tracer ??= trace.getTracer(getEnv().OTEL_SERVICE_NAME || "api"));
}

export function getMeter(): Meter {
  return (_meter ??= metrics.getMeter(getEnv().OTEL_SERVICE_NAME || "api"));
}

export async function withSpan<T>(
  name: string,
  fn: () => Promise<T>
): Promise<T> {
  return await getTracer().startActiveSpan(name, async (span) => {
    try {
      const result = await fn();
      span.end();
      return result;
    } catch (error) {
      span.recordException(error as Error);
      span.end();
      throw error;
    }
  });
}

export type { Tracer, Meter };
