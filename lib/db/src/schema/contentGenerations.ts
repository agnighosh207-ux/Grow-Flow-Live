import { pgTable, text, serial, timestamp, integer, jsonb, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const contentGenerationsTable = pgTable("content_generations", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  idea: text("idea").notNull(),
  contentType: text("content_type").notNull(),
  tone: text("tone").notNull(),
  content: jsonb("content").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  userIdIdx: index("content_generations_user_id_idx").on(table.userId),
  createdAtIdx: index("content_generations_created_at_idx").on(table.createdAt),
}));

export const insertContentGenerationSchema = createInsertSchema(contentGenerationsTable).omit({ id: true, createdAt: true });
export type InsertContentGeneration = z.infer<typeof insertContentGenerationSchema>;
export type ContentGeneration = typeof contentGenerationsTable.$inferSelect;
