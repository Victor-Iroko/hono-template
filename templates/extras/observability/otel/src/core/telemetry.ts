import { trace, metrics, type Tracer, type Meter } from "@opentelemetry/api";
import { env } from "./env-validation.js";

const SERVICE_NAME = env.OTEL_SERVICE_NAME;

export const tracer: Tracer = trace.getTracer(SERVICE_NAME);
export const meter: Meter = metrics.getMeter(SERVICE_NAME);

export async function withSpan<T>(
  name: string,
  fn: () => Promise<T>
): Promise<T> {
  return await tracer.startActiveSpan(name, async (span) => {
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
