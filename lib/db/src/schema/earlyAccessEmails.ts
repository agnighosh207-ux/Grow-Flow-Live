import { pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";

export const earlyAccessEmailsTable = pgTable("early_access_emails", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  source: text("source").default("pricing"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type EarlyAccessEmail = typeof earlyAccessEmailsTable.$inferSelect;
export type InsertEarlyAccessEmail = typeof earlyAccessEmailsTable.$inferInsert;
