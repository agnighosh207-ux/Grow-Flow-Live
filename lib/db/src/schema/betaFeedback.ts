import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";

export const betaFeedbackTable = pgTable("beta_feedback", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  rating: integer("rating").notNull(),
  comment: text("comment"),
  trigger: text("trigger").notNull(),
  page: text("page").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type BetaFeedback = typeof betaFeedbackTable.$inferSelect;
export type InsertBetaFeedback = typeof betaFeedbackTable.$inferInsert;
