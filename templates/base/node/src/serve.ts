import { validateEnv, env } from "./core/env-validation.js";

validateEnv();

const { serve } = await import("@hono/node-server");
const { isInstrumentationInitialized, initializeInstrumentation } = await import("./instrument.js").catch(() => ({
  isInstrumentationInitialized: () => false,
  initializeInstrumentation: () => {},
}));

initializeInstrumentation();

const { default: app } = await import("./index.js");

const port = env.PORT;

serve({ fetch: app.fetch, port }, (info) => {
  console.log(`🚀 Server listening on http://localhost:${info.port}`);
});
