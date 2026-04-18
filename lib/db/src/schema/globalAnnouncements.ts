import { pgTable, text, timestamp, boolean } from "drizzle-orm/pg-core";

export const globalAnnouncementsTable = pgTable("global_announcements", {
  id: text("id").primaryKey(),
  message: text("message").notNull(),
  isActive: boolean("is_active").notNull().default(false),
  theme: text("theme").notNull().default("info"), // "info", "warning", "success", "error"
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type GlobalAnnouncement = typeof globalAnnouncementsTable.$inferSelect;
export type InsertGlobalAnnouncement = typeof globalAnnouncementsTable.$inferInsert;
