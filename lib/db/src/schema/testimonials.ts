import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const testimonialsTable = pgTable("testimonials", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  handle: text("handle").notNull(),
  platform: text("platform").notNull(), // 'instagram', 'twitter', etc.
  avatar: text("avatar"),
  quote: text("quote").notNull(),
  planTier: text("plan_tier"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
