import { AsyncLocalStorage } from "node:async_hooks";
import type { Logger } from "pino";
import { logger as rootLogger } from "./logger.js";

type RequestContext = {
  requestId: string;
  correlationId: string;
  logger: Logger;
};

const requestContext = new AsyncLocalStorage<RequestContext>();

export function runWithRequestContext<T>(context: RequestContext, fn: () => T): T {
  return requestContext.run(context, fn);
}

export function getRequestContext() {
  return requestContext.getStore();
}

export function getLogger() {
  return requestContext.getStore()?.logger ?? rootLogger;
}

export function getRequestId() {
  return requestContext.getStore()?.requestId;
}

export function getCorrelationId() {
  return requestContext.getStore()?.correlationId;
}
