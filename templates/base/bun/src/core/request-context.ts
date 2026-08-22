import { AsyncLocalStorage } from "node:async_hooks";
import type { Logger } from "pino";

export interface RequestContext {
  requestId: string;
  correlationId: string;
  logger: Logger;
}

const asyncLocalStorage = new AsyncLocalStorage<RequestContext>();

export function getRequestContext(): RequestContext | undefined {
  return asyncLocalStorage.getStore();
}

export function runWithRequestContext<T>(context: RequestContext, fn: () => T): T {
  return asyncLocalStorage.run(context, fn);
}
