import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const emailOtps = sqliteTable("email_otps", {
  id: text("id").primaryKey(),
  email: text("email").notNull(),
  otpHash: text("otp_hash").notNull(),
  type: text("type").default("email-verification").notNull(),
  attempts: integer("attempts").default(0).notNull(),
  expiresAt: integer("expires_at", { mode: "timestamp" }).notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(() => new Date()).notNull(),
});

export type EmailOtp = typeof emailOtps.$inferSelect;
export type NewEmailOtp = typeof emailOtps.$inferInsert;
