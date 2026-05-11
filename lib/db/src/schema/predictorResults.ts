import { pgTable, text, timestamp, integer, uuid } from "drizzle-orm/pg-core";
import { usersTable } from "./users";

export const predictorResultsTable = pgTable("predictor_results", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => usersTable.id),
  content: text("content").notNull(),
  platform: text("platform").notNull(),
  niche: text("niche").notNull(),
  overallScore: integer("overall_score").notNull(),
  algorithmScore: integer("algorithm_score"),
  hookScore: integer("hook_score").notNull(),
  verdict: text("verdict").notNull(),
  topFix: text("top_fix").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
