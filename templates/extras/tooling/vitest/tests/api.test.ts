import { describe, it, expect } from "vitest";
import { api } from "./helpers.js";

describe("API Health Endpoint", () => {
  it("should return status ok on /api/v1/health", async () => {
    const res = await api("/api/v1/health");
    expect(res.status).toBe(200);

    const json = res.body as { status: string };
    expect(json.status).toBe("ok");
  });

  it("should return 404 for unknown endpoints", async () => {
    const res = await api("/unknown-path");
    expect(res.status).toBe(404);

    const json = res.body as { error: { code: string } };
    expect(json.error.code).toBe("not_found");
  });
});
