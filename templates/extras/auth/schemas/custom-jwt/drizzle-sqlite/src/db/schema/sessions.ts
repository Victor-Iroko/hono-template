import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { users } from "./users.js";

export const userSessions = sqliteTable("user_sessions", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  sessionId: text("session_id").notNull().unique(),
  refreshTokenHash: text("refresh_token_hash").notNull().unique(),
  deviceName: text("device_name"),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  lastActiveAt: integer("last_active_at", { mode: "timestamp" }).$defaultFn(() => new Date()).notNull(),
  expiresAt: integer("expires_at", { mode: "timestamp" }).notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(() => new Date()).notNull(),
});

export type UserSession = typeof userSessions.$inferSelect;
export type NewUserSession = typeof userSessions.$inferInsert;
