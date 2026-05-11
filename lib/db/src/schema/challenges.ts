import { pgTable, serial, text, timestamp, integer, boolean } from "drizzle-orm/pg-core";
import { usersTable } from "./users";

export const challengeParticipantsTable = pgTable("challenge_participants", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  challengeId: text("challenge_id").notNull(),
  startDate: timestamp("start_date", { withTimezone: true }).notNull().defaultNow(),
  completedDays: integer("completed_days").notNull().default(0),
  isCompleted: boolean("is_completed").notNull().default(false),
  certificateId: text("certificate_id"),
  lastCompletedAt: timestamp("last_completed_at", { withTimezone: true }),
});

export type ChallengeParticipant = typeof challengeParticipantsTable.$inferSelect;
export type InsertChallengeParticipant = typeof challengeParticipantsTable.$inferInsert;
