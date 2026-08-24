import { integer, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const emailOtps = pgTable("email_otps", {
  id: uuid("id").defaultRandom().primaryKey(),
  email: text("email").notNull(),
  otpHash: text("otp_hash").notNull(),
  type: text("type").default("email-verification").notNull(),
  attempts: integer("attempts").default(0).notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export type EmailOtp = typeof emailOtps.$inferSelect;
export type NewEmailOtp = typeof emailOtps.$inferInsert;
