import { mysqlTable, varchar, text, timestamp } from "drizzle-orm/mysql-core";
import { users } from "./users.js";

export const userSessions = mysqlTable("user_sessions", {
  id: varchar("id", { length: 36 }).primaryKey(),
  userId: varchar("user_id", { length: 36 })
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  sessionId: varchar("session_id", { length: 36 }).notNull().unique(),
  refreshTokenHash: varchar("refresh_token_hash", { length: 255 }).notNull().unique(),
  deviceName: text("device_name"),
  ipAddress: varchar("ip_address", { length: 45 }),
  userAgent: text("user_agent"),
  lastActiveAt: timestamp("last_active_at").defaultNow().notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type UserSession = typeof userSessions.$inferSelect;
export type NewUserSession = typeof userSessions.$inferInsert;
