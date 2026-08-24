import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { users } from "./users.js";

export type SecurityAuditAction =
  | "login"
  | "logout"
  | "session_revoked"
  | "session_replaced"
  | "token_reuse_detected"
  | "password_changed"
  | "email_changed"
  | "account_deleted";

export const securityAuditLog = sqliteTable("security_audit_log", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  action: text("action").$type<SecurityAuditAction>().notNull(),
  metadata: text("metadata", { mode: "json" }).$type<Record<string, unknown>>(),
  ipAddress: text("ip_address"),
  createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(() => new Date()).notNull(),
});

export type SecurityAuditLog = typeof securityAuditLog.$inferSelect;
export type NewSecurityAuditLog = typeof securityAuditLog.$inferInsert;
