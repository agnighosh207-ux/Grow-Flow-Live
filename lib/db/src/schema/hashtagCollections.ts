import { pgTable, text, uuid, timestamp, jsonb, index } from "drizzle-orm/pg-core";
import { usersTable } from "./users";

export const hashtagCollectionsTable = pgTable("hashtag_collections", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  platform: text("platform").notNull(),
  tags: jsonb("tags").notNull().$type<string[]>(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  userIdIdx: index("hashtag_collections_user_id_idx").on(table.userId),
}));

export type HashtagCollection = typeof hashtagCollectionsTable.$inferSelect;
export type InsertHashtagCollection = typeof hashtagCollectionsTable.$inferInsert;
