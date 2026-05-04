import { db, usersTable, contentGenerationsTable } from "@workspace/db";
import { eq, and, lte, gte, isNull, sql, notInArray, desc } from "drizzle-orm";
import { sendReengagementEmail, sendReactivationEmail } from "../services/email";
import { logger } from "../lib/logger";

export async function runReengagementLogic() {
  const now = new Date();
  const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  
  let sent = 0;
  let skipped = 0;

  try {
    // 1. Find churned active users
    // Criteria: Active in past but no generation in last 14 days
    // We join with a subquery that finds the last generation date per user
    const lastGens = db.select({
      userId: contentGenerationsTable.userId,
      maxDate: sql<Date>`max(${contentGenerationsTable.createdAt})`.as("max_date")
    })
    .from(contentGenerationsTable)
    .groupBy(contentGenerationsTable.userId)
    .as("last_gens");

    const churnedUsers = await db.select({
      email: usersTable.email,
      lastGenerationAt: lastGens.maxDate,
    })
    .from(usersTable)
    .innerJoin(lastGens, eq(usersTable.id, lastGens.userId))
    .where(and(
      eq(usersTable.emailNotifications, true),
      lte(lastGens.maxDate, fourteenDaysAgo)
    ));

    for (const user of churnedUsers) {
      if (!user.email) continue;
      const daysSince = Math.floor((now.getTime() - new Date(user.lastGenerationAt!).getTime()) / (1000 * 60 * 60 * 24));
      await sendReengagementEmail(user.email, daysSince);
      sent++;
    }

    // 2. Find "Zombie" users (Signed up > 7 days ago, never generated anything)
    const zombieUsers = await db.select({
      email: usersTable.email,
    })
    .from(usersTable)
    .where(and(
      eq(usersTable.emailNotifications, true),
      lte(usersTable.createdAt, sevenDaysAgo),
      eq(usersTable.totalGenerations, 0),
      eq(usersTable.generationsRemaining, 5) // Assuming 5 is the starting credit
    ));

    for (const user of zombieUsers) {
      if (!user.email) continue;
      await sendReactivationEmail(user.email);
      sent++;
    }

    return { sent, skipped };
  } catch (err) {
    logger.error({ err }, "Re-engagement cron logic failed");
    throw err;
  }
}
