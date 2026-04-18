import { pgTable, text, serial, timestamp } from "drizzle-orm/pg-core";
import { usersTable } from "./users";

export const usageLogsTable = pgTable("usage_logs", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull().references(() => usersTable.id),
  promptLanguage: text("prompt_language").notNull(),
  action: text("action").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type UsageLog = typeof usageLogsTable.$inferSelect;
export type InsertUsageLog = typeof usageLogsTable.$inferInsert;
