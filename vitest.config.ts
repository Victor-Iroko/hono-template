import dotenv from "dotenv";
import { defineConfig } from "vitest/config";
import path from "node:path";

dotenv.config({ path: path.resolve(__dirname, ".env.test") });

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["tests/**/*.test.ts"],
    setupFiles: ["./tests/setup.ts"],
    testTimeout: 60000,
    hookTimeout: 60000,
    pool: "forks",
  },
  resolve: {
    alias: {
      "#": path.resolve(__dirname, "src"),
    },
  },
});
