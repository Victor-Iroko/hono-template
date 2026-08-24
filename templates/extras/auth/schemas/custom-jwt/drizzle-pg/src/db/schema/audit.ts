import { jsonb, pgEnum, pgTable, timestamp, uuid, varchar } from "drizzle-orm/pg-core";
import { users } from "./users.js";

export const securityAuditActionEnum = pgEnum("security_audit_action", [
  "login",
  "logout",
  "session_revoked",
  "session_replaced",
  "token_reuse_detected",
  "password_changed",
  "email_changed",
  "account_deleted",
]);

export const securityAuditLog = pgTable("security_audit_log", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  action: securityAuditActionEnum("action").notNull(),
  metadata: jsonb("metadata").$type<Record<string, unknown>>(),
  ipAddress: varchar("ip_address", { length: 45 }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export type SecurityAuditLog = typeof securityAuditLog.$inferSelect;
export type NewSecurityAuditLog = typeof securityAuditLog.$inferInsert;
export type SecurityAuditAction = (typeof securityAuditActionEnum.enumValues)[number];
