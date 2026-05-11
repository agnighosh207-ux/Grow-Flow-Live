import { pgTable, text, timestamp, integer } from "drizzle-orm/pg-core";

export const teamsTable = pgTable("teams", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  ownerId: text("owner_id").notNull(),
  planTier: text("plan_tier").notNull().default("agency"),
  seatsUsed: integer("seats_used").notNull().default(1),
  maxSeats: integer("max_seats").notNull().default(5),
  billingUserId: text("billing_user_id").notNull(),
  teamCode: text("team_code").unique(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
