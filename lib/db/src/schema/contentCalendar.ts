import { pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { usersTable } from "./users";

export const contentCalendarTable = pgTable("content_calendar", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  date: timestamp("date", { withTimezone: true }).notNull(),
  idea: text("idea").notNull(),
  platform: text("platform").notNull(),
  contentType: text("content_type").notNull(),
  status: text("status").notNull().default("planned"), // planned, draft, scheduled, published
  generationId: text("generation_id"), // FK or reference to contentGenerations
  notes: text("notes"),
  scheduledTime: text("scheduled_time"), // e.g., "9:00 AM"
  color: text("color"), // for UI color coding
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type ContentCalendar = typeof contentCalendarTable.$inferSelect;
export type InsertContentCalendar = typeof contentCalendarTable.$inferInsert;
