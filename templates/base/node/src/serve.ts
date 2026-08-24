import { validateEnv } from "./core/env.js";

const env = validateEnv();

const { serve } = await import("@hono/node-server");
const { initializeInstrumentation } = await import("./instrument.js").catch(() => ({
  initializeInstrumentation: () => {},
}));

initializeInstrumentation();

const { default: app } = await import("./index.js");

const port = env.PORT;

serve({ fetch: app.fetch, port }, (info) => {
  console.log(`🚀 Server listening on http://localhost:${info.port}`);
});
