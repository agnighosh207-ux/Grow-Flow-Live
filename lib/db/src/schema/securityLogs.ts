import { pgTable, text, timestamp, jsonb, pgEnum } from "drizzle-orm/pg-core";

export const eventTypeEnum = pgEnum("security_event_type", ["RATE_LIMIT", "SUSPICIOUS_SPEED", "AUTH_FAILURE", "SYSTEM_BAN"]);

export const securityLogsTable = pgTable("security_logs", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  eventType: eventTypeEnum("event_type").notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  metadata: jsonb("metadata").default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type SecurityLog = typeof securityLogsTable.$inferSelect;
export type InsertSecurityLog = typeof securityLogsTable.$inferInsert;
