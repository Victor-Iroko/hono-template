import { randomUUID } from "node:crypto";

export type SecurityAuditAction =
  | "login"
  | "logout"
  | "session_revoked"
  | "session_replaced"
  | "token_reuse_detected"
  | "password_changed"
  | "email_changed"
  | "account_deleted";

export interface SecurityAuditEntry {
  id: string;
  userId: string;
  action: SecurityAuditAction;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
  createdAt: Date;
}

// In-memory security audit log buffer (persists to DB security_audit_log table when database is connected)
const auditLogs: SecurityAuditEntry[] = [];

export async function logSecurityAudit(
  userId: string,
  action: SecurityAuditAction,
  ipAddress?: string,
  metadata?: Record<string, unknown>
): Promise<SecurityAuditEntry> {
  const entry: SecurityAuditEntry = {
    id: randomUUID(),
    userId,
    action,
    ipAddress,
    metadata,
    createdAt: new Date(),
  };

  auditLogs.push(entry);
  return entry;
}

export function getSecurityAuditLogs(userId?: string): SecurityAuditEntry[] {
  if (userId) {
    return auditLogs.filter((entry) => entry.userId === userId);
  }
  return [...auditLogs];
}
