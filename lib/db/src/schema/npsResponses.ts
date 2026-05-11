import { pgTable, text, timestamp, integer, uuid } from "drizzle-orm/pg-core";
import { usersTable } from "./users";

export const npsResponsesTable = pgTable("nps_responses", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id").references(() => usersTable.id).notNull(),
  score: integer("score").notNull(), // 0-10
  comment: text("comment"),
  planTier: text("plan_tier"),
  generationsCount: integer("generations_count"),
  trigger: text("trigger"), // e.g., "10th_generation", "30_days_active", "upgrade"
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type NpsResponse = typeof npsResponsesTable.$inferSelect;
export type InsertNpsResponse = typeof npsResponsesTable.$inferInsert;
