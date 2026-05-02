import { pgTable, text, serial, timestamp, index } from "drizzle-orm/pg-core";
import { usersTable } from "./users";

export const usageLogsTable = pgTable("usage_logs", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull().references(() => usersTable.id),
  promptLanguage: text("prompt_language").notNull(),
  action: text("action").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => {
  return {
    userIdIdx: index("usage_logs_user_id_idx").on(table.userId),
  };
});

export type UsageLog = typeof usageLogsTable.$inferSelect;
export type InsertUsageLog = typeof usageLogsTable.$inferInsert;
