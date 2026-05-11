import { pgTable, uuid, varchar, text, timestamp, integer } from "drizzle-orm/pg-core";

export const sharingLinksTable = pgTable("sharing_links", {
  id: varchar("id", { length: 25 }).primaryKey(), // nanoid
  userId: text("user_id").notNull(),
  contentId: integer("content_id").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  viewCount: integer("view_count").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

export const shareFeedbacksTable = pgTable("share_feedbacks", {
  id: uuid("id").primaryKey().defaultRandom(),
  shareId: varchar("share_id", { length: 25 }).notNull(),
  status: varchar("status", { length: 20 }).notNull(), // 'approved', 'needs_changes'
  comment: text("comment"),
  createdAt: timestamp("created_at").defaultNow(),
});
