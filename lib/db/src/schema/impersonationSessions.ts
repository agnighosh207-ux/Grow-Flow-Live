import { pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { usersTable } from "./users";

export const impersonationSessionsTable = pgTable("impersonation_sessions", {
  id: text("id").primaryKey(),
  adminId: text("admin_id").references(() => usersTable.id).notNull(),
  targetUserId: text("target_user_id").references(() => usersTable.id).notNull(),
  reason: text("reason").notNull(),
  startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  endedAt: timestamp("ended_at", { withTimezone: true }),
  ipAddress: text("ip_address"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type ImpersonationSession = typeof impersonationSessionsTable.$inferSelect;
export type InsertImpersonationSession = typeof impersonationSessionsTable.$inferInsert;
