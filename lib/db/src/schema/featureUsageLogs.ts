import { pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const featureUsageLogsTable = pgTable("feature_usage_logs", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  feature: text("feature").notNull(), // values like "content_generate", "hooks", "ideas", "strategy", "trends", "bio", "caption", "repurpose", "daily", "variations"
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type FeatureUsageLog = typeof featureUsageLogsTable.$inferSelect;
export type InsertFeatureUsageLog = typeof featureUsageLogsTable.$inferInsert;
