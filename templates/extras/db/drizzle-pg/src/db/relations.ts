import { relations as drizzleRelations } from "drizzle-orm";
import { users } from "./models/users.js";
import { userSessions } from "./models/sessions.js";
import { securityAuditLog } from "./models/audit.js";

export const usersRelations = drizzleRelations(users, ({ many }) => ({
  sessions: many(userSessions),
  auditLogs: many(securityAuditLog),
}));

export const userSessionsRelations = drizzleRelations(userSessions, ({ one }) => ({
  user: one(users, {
    fields: [userSessions.userId],
    references: [users.id],
  }),
}));

export const securityAuditLogRelations = drizzleRelations(securityAuditLog, ({ one }) => ({
  user: one(users, {
    fields: [securityAuditLog.userId],
    references: [users.id],
  }),
}));

export const relations = {
  usersRelations,
  userSessionsRelations,
  securityAuditLogRelations,
};
