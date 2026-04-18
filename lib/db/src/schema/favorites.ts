import { pgTable, text, integer, timestamp, primaryKey } from "drizzle-orm/pg-core";

export const favoritesTable = pgTable("favorites", {
  userId: text("user_id").notNull(),
  generationId: integer("generation_id").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  primaryKey({ columns: [table.userId, table.generationId] }),
]);

export type Favorite = typeof favoritesTable.$inferSelect;
