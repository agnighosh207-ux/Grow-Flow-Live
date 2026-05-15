import { pgTable, text, serial, timestamp, jsonb, index, boolean, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { usersTable } from "./users";
import { z } from "zod";

export const contentGenerationsTable = pgTable("content_generations", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  idea: text("idea").notNull(),
  contentType: text("content_type").notNull(),
  tone: text("tone").notNull(),
  platform: text("platform"),
  content: jsonb("content").notNull(),
  source: text("source"),
  isPublic: boolean("is_public").notNull().default(false),
  tags: text("tags").array().notNull().default([]),
  isFavorited: boolean("is_favorited").default(false),
  usedCount: integer("used_count").default(0),
  lastUsedAt: timestamp("last_used_at", { withTimezone: true }),
  performanceNote: text("performance_note"),
  folderId: text("folder_id"),
  promptLanguage: text("prompt_language").default("English"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
}, (table) => ({
  userIdIdx: index("content_generations_user_id_idx").on(table.userId),
  createdAtIdx: index("content_generations_created_at_idx").on(table.createdAt),
  userIdCreatedAtIdx: index("content_generations_user_id_created_at_idx").on(table.userId, table.createdAt),
}));

export const insertContentGenerationSchema = createInsertSchema(contentGenerationsTable).omit({ id: true, createdAt: true }) as unknown as z.ZodObject<any>;
export type InsertContentGeneration = z.infer<typeof insertContentGenerationSchema>;
export type ContentGeneration = typeof contentGenerationsTable.$inferSelect;
