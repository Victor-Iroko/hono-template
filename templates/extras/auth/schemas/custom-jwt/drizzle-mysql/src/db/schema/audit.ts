import { json, mysqlEnum, mysqlTable, timestamp, varchar } from "drizzle-orm/mysql-core";
import { users } from "./users.js";

export const securityAuditActionEnum = [
  "login",
  "logout",
  "session_revoked",
  "session_replaced",
  "token_reuse_detected",
  "password_changed",
  "email_changed",
  "account_deleted",
] as const;

export type SecurityAuditAction = (typeof securityAuditActionEnum)[number];

export const securityAuditLog = mysqlTable("security_audit_log", {
  id: varchar("id", { length: 36 }).primaryKey(),
  userId: varchar("user_id", { length: 36 })
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  action: mysqlEnum("action", securityAuditActionEnum).notNull(),
  metadata: json("metadata").$type<Record<string, unknown>>(),
  ipAddress: varchar("ip_address", { length: 45 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type SecurityAuditLog = typeof securityAuditLog.$inferSelect;
export type NewSecurityAuditLog = typeof securityAuditLog.$inferInsert;
