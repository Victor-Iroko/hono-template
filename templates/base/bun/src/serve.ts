import { validateEnv } from "./core/env.js";

const env = validateEnv();

const { initializeInstrumentation } = await import("./instrument.js").catch(() => ({
  initializeInstrumentation: () => {},
}));

initializeInstrumentation();

const { default: app } = await import("./index.js");

const port = env.PORT;

export default {
  port,
  fetch: app.fetch,
};

console.log(`🚀 Server listening on http://localhost:${port}`);
