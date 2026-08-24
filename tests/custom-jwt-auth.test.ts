import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { mkdtemp, rm, mkdir } from "node:fs/promises";
import { join, resolve } from "node:path";
import { runInstallers } from "../src/installers/index.js";

describe("Custom JWT Stateful Opaque Refresh Token System", () => {
  let tempDir: string;
  const templateRoot = resolve(import.meta.dir, "../templates");
  const testBaseDir = resolve(import.meta.dir, "../.test-tmp");

  beforeEach(async () => {
    process.env.ACCESS_TOKEN_SECRET_KEY = "test-jwt-secret-12345";
    await mkdir(testBaseDir, { recursive: true });
    tempDir = await mkdtemp(join(testBaseDir, "jwt-auth-test-"));
    await runInstallers({
      options: {
        projectName: "jwt-test-app",
        projectDir: tempDir,
        runtime: "bun",
        db: "none",
        auth: "custom-jwt",
        firebaseAuth: false,
        redis: "none",
        observability: "none",
        docs: "none",
        email: "none",
        storage: "none",
        payments: "none",
        qstash: false,
        linter: "none",
        git: false,
        installDeps: false,
        packageManager: "bun",
      },
      templateRoot,
      projectDir: tempDir,
    });
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  it("should generate cryptographically secure 64-char opaque refresh token and deterministic hash", async () => {
    const { generateOpaqueRefreshToken, hashRefreshToken } = await import(
      join(tempDir, "src/api/v1/auth/tokens.ts")
    );

    const token1 = generateOpaqueRefreshToken();
    const token2 = generateOpaqueRefreshToken();

    expect(token1).toBeDefined();
    expect(token1.length).toBe(64); // 32 bytes in hex
    expect(token2.length).toBe(64);
    expect(token1).not.toBe(token2);

    const hash1 = hashRefreshToken(token1);
    const hash2 = hashRefreshToken(token1);
    expect(hash1).toBe(hash2);
    expect(hash1.length).toBe(64);
    expect(hash1).not.toBe(token1);
  });

  it("should sign and verify access token JWT with session ID", async () => {
    const { signAccessToken, verifyAccessToken } = await import(
      join(tempDir, "src/api/v1/auth/tokens.ts")
    );

    const user = { userId: "user-123", email: "user@example.com", role: "admin", sid: "session-abc-456" };

    const accessToken = await signAccessToken(user);
    expect(accessToken).toBeDefined();
    expect(accessToken.split(".").length).toBe(3);

    const payload = await verifyAccessToken(accessToken);
    expect(payload.userId).toBe(user.userId);
    expect(payload.email).toBe(user.email);
    expect(payload.role).toBe(user.role);
    expect(payload.sid).toBe(user.sid);
  });

  it("should create a stateful session and record security audit log", async () => {
    const { upsertUserSession, getSessionByRefreshToken } = await import(
      join(tempDir, "src/api/v1/auth/session.ts")
    );
    const { hashRefreshToken } = await import(
      join(tempDir, "src/api/v1/auth/tokens.ts")
    );
    const { getSecurityAuditLogs } = await import(
      join(tempDir, "src/api/v1/auth/audit.ts")
    );

    const user = { id: "user-test-1", email: "test@example.com", role: "user" };
    const result = await upsertUserSession(user, {
      deviceName: "iPhone 15 Pro",
      ipAddress: "192.168.1.1",
    });

    expect(result.tokens.accessToken).toBeDefined();
    expect(result.tokens.refreshToken).toBeDefined();
    expect(result.tokens.refreshToken.length).toBe(64);
    expect(result.tokens.sessionId).toBeDefined();
    expect(result.tokens.expiresIn).toBe(900); // 15 mins

    const session = getSessionByRefreshToken(result.tokens.refreshToken);
    expect(session).toBeDefined();
    expect(session?.userId).toBe(user.id);
    expect(session?.deviceName).toBe("iPhone 15 Pro");
    expect(session?.refreshTokenHash).toBe(hashRefreshToken(result.tokens.refreshToken));

    const audits = getSecurityAuditLogs(user.id);
    expect(audits.length).toBeGreaterThanOrEqual(1);
    expect(audits[audits.length - 1].action).toBe("login");
  });

  it("should successfully rotate refresh token upon refresh and log audit", async () => {
    const { upsertUserSession, rotateUserSession, getSessionByRefreshToken } = await import(
      join(tempDir, "src/api/v1/auth/session.ts")
    );
    const { getSecurityAuditLogs } = await import(
      join(tempDir, "src/api/v1/auth/audit.ts")
    );

    const user = { id: "user-rotate-1", email: "rotate@example.com", role: "user" };
    const initial = await upsertUserSession(user);
    const initialRefreshToken = initial.tokens.refreshToken;

    const rotated = await rotateUserSession(initialRefreshToken, user);

    expect(rotated.tokens.accessToken).toBeDefined();
    expect(rotated.tokens.refreshToken).toBeDefined();
    expect(rotated.tokens.refreshToken).not.toBe(initialRefreshToken);
    expect(rotated.tokens.sessionId).toBe(initial.tokens.sessionId);

    // Old token should no longer be found
    const oldSession = getSessionByRefreshToken(initialRefreshToken);
    expect(oldSession).toBeUndefined();

    // New token should be active
    const activeSession = getSessionByRefreshToken(rotated.tokens.refreshToken);
    expect(activeSession).toBeDefined();
    expect(activeSession?.sessionId).toBe(initial.tokens.sessionId);

    const audits = getSecurityAuditLogs(user.id);
    expect(audits.some((a: { action: string }) => a.action === "session_replaced")).toBe(true);
  });

  it("should detect reuse of already consumed refresh token and revoke session with audit", async () => {
    const { upsertUserSession, rotateUserSession } = await import(
      join(tempDir, "src/api/v1/auth/session.ts")
    );
    const { getSecurityAuditLogs } = await import(
      join(tempDir, "src/api/v1/auth/audit.ts")
    );

    const user = { id: "user-reuse-1", email: "reuse@example.com", role: "user" };
    const initial = await upsertUserSession(user);
    const initialRefreshToken = initial.tokens.refreshToken;

    // First rotation succeeds
    const rotated = await rotateUserSession(initialRefreshToken, user);
    expect(rotated.tokens.refreshToken).toBeDefined();

    // Replay attack / reuse of the old token should fail
    expect(rotateUserSession(initialRefreshToken, user)).rejects.toThrow();

    const audits = getSecurityAuditLogs(user.id);
    expect(audits.some((a: { action: string }) => a.action === "token_reuse_detected")).toBe(true);
  });

  it("should revoke single session on logout and record audit", async () => {
    const { upsertUserSession, revokeUserSession, getSessionByRefreshToken } = await import(
      join(tempDir, "src/api/v1/auth/session.ts")
    );
    const { getSecurityAuditLogs } = await import(
      join(tempDir, "src/api/v1/auth/audit.ts")
    );

    const user = { id: "user-logout-1", email: "logout@example.com", role: "user" };
    const result = await upsertUserSession(user);

    expect(getSessionByRefreshToken(result.tokens.refreshToken)).toBeDefined();

    await revokeUserSession(result.tokens.sessionId);

    expect(getSessionByRefreshToken(result.tokens.refreshToken)).toBeUndefined();

    const audits = getSecurityAuditLogs(user.id);
    expect(audits.some((a: { action: string }) => a.action === "session_revoked")).toBe(true);
  });

  it("should revoke all sessions for a user on logout all devices", async () => {
    const { upsertUserSession, revokeAllUserSessions, getSessionByRefreshToken } = await import(
      join(tempDir, "src/api/v1/auth/session.ts")
    );

    const user = { id: "user-logout-all", email: "logoutall@example.com", role: "user" };
    const s1 = await upsertUserSession(user, { deviceName: "MacBook" });
    const s2 = await upsertUserSession(user, { deviceName: "iPhone" });

    expect(getSessionByRefreshToken(s1.tokens.refreshToken)).toBeDefined();
    expect(getSessionByRefreshToken(s2.tokens.refreshToken)).toBeDefined();

    const count = await revokeAllUserSessions(user.id);
    expect(count).toBeGreaterThanOrEqual(2);

    expect(getSessionByRefreshToken(s1.tokens.refreshToken)).toBeUndefined();
    expect(getSessionByRefreshToken(s2.tokens.refreshToken)).toBeUndefined();
  });
});
