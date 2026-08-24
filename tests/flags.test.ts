import { describe, it, expect } from "bun:test";
import { parseCliFlags } from "../src/cli/flags.js";

describe("CLI Flags Parser", () => {
  it("should parse project name and defaults", () => {
    const { projectName, flags } = parseCliFlags(["node", "index.js", "my-app"]);
    expect(projectName).toBe("my-app");
    expect(flags.git).toBe(true);
    expect(flags.install).toBe(true);
    expect(flags.nonInteractive).toBe(false);
  });

  it("should parse custom flags including resend email and cloudinary storage", () => {
    const { projectName, flags } = parseCliFlags([
      "node",
      "index.js",
      "custom-app",
      "--runtime",
      "node",
      "--db",
      "postgres",
      "--auth",
      "custom-jwt",
      "--redis",
      "ioredis",
      "--observability",
      "sentry",
      "--storage",
      "cloudinary",
      "--email",
      "resend",
      "--no-git",
      "--no-install",
      "--non-interactive",
    ]);

    expect(projectName).toBe("custom-app");
    expect(flags.runtime).toBe("node");
    expect(flags.db).toBe("postgres");
    expect(flags.auth).toBe("custom-jwt");
    expect(flags.redis).toBe("ioredis");
    expect(flags.observability).toBe("sentry");
    expect(flags.storage).toBe("cloudinary");
    expect(flags.email).toBe("resend");
    expect(flags.git).toBe(false);
    expect(flags.install).toBe(false);
    expect(flags.nonInteractive).toBe(true);
  });

  it("should parse queue flags correctly", () => {
    const { flags: flagsBullmq } = parseCliFlags(["node", "index.js", "app", "--queue", "bullmq"]);
    expect(flagsBullmq.queue).toBe("bullmq");

    const { flags: flagsBullmqBool } = parseCliFlags(["node", "index.js", "app", "--bullmq"]);
    expect(flagsBullmqBool.queue).toBe("bullmq");

    const { flags: flagsQStash } = parseCliFlags(["node", "index.js", "app", "--qstash"]);
    expect(flagsQStash.queue).toBe("qstash");
  });
});

