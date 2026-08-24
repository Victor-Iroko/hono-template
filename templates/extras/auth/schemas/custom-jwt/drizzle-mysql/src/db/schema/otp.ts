import { int, mysqlTable, timestamp, varchar } from "drizzle-orm/mysql-core";

export const emailOtps = mysqlTable("email_otps", {
  id: varchar("id", { length: 36 }).primaryKey(),
  email: varchar("email", { length: 255 }).notNull(),
  otpHash: varchar("otp_hash", { length: 255 }).notNull(),
  type: varchar("type", { length: 50 }).default("email-verification").notNull(),
  attempts: int("attempts").default(0).notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type EmailOtp = typeof emailOtps.$inferSelect;
export type NewEmailOtp = typeof emailOtps.$inferInsert;
