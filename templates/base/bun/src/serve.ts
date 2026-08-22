import { validateEnv } from "./core/env-validation.js";

validateEnv();

const { isInstrumentationInitialized, initializeInstrumentation } = await import("./instrument.js").catch(() => ({
  isInstrumentationInitialized: () => false,
  initializeInstrumentation: () => {},
}));

initializeInstrumentation();

const { default: app } = await import("./index.js");

const port = Number(process.env.PORT) || 3000;

export default {
  port,
  fetch: app.fetch,
};

console.log(`🚀 Server listening on http://localhost:${port}`);
