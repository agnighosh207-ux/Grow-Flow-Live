import { pgTable, text, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const brandVoicesTable = pgTable("brand_voices", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  voiceName: text("voice_name").notNull().default("My Voice"),
  samplePosts: text("sample_posts").array().notNull().default([]),
  tone: text("tone"),
  vocabulary: text("vocabulary").array(),
  avoidWords: text("avoid_words").array(),
  emojiUsage: text("emoji_usage"),
  postLength: text("post_length"),
  uniquePhrases: text("unique_phrases").array(),
  aiDescription: text("ai_description"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertBrandVoiceSchema = createInsertSchema(brandVoicesTable).omit({ id: true, createdAt: true });
export type InsertBrandVoice = z.infer<typeof insertBrandVoiceSchema>;
export type BrandVoice = typeof brandVoicesTable.$inferSelect;
