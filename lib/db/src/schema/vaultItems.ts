import { pgTable, text, timestamp, boolean, jsonb } from "drizzle-orm/pg-core";

export const vaultItemsTable = pgTable("vault_items", {
  id: text("id").primaryKey(), // uuid
  title: text("title").notNull(),
  platform: text("platform").notNull(),
  niche: text("niche").notNull(),
  contentType: text("content_type").notNull(),
  hookText: text("hook_text").notNull(),
  bodyText: text("body_text"),
  whyItWorks: text("why_it_works").notNull(),
  estimatedReach: text("estimated_reach").notNull(),
  format: text("format").notNull(), // carousel, reel, thread, short
  tags: jsonb("tags").$type<string[]>().notNull().default([]),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type VaultItem = typeof vaultItemsTable.$inferSelect;
export type InsertVaultItem = typeof vaultItemsTable.$inferInsert;
