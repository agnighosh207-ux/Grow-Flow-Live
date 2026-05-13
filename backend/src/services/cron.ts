import { db, usersTable } from "@workspace/db";
import { eq, and, gt, sql, lt } from "drizzle-orm";
import { sendStreakAtRiskEmail } from "./email";
import { sendSequenceEmail } from "./emailSequences";
import { logger } from "../lib/logger";

/**
 * Daily Cron Task
 * Triggered via secure GitHub Action / API endpoint
 * 
 * Logic:
 * 1. Notify users at risk of breaking streaks
 * 2. Send activation emails (Day 1, Day 3) to users with 0 generations
 * 3. Send re-engagement emails (Day 7) to inactive users
 */
export async function processDailyCron() {
  logger.info("Starting Daily Cron Process...");
  const todayDate = new Date().toISOString().split('T')[0];
  
  try {
    // 1. STREAK AT RISK NOTIFICATIONS
    const atRiskUsers = await db.select({
      id: usersTable.id,
      email: usersTable.email,
      displayName: usersTable.displayName,
      firstName: usersTable.firstName,
      currentStreak: usersTable.currentStreak,
    })
    .from(usersTable)
    .where(and(
      gt(usersTable.currentStreak, 0),
      sql`${usersTable.lastStreakDate} != ${todayDate}`,
      eq(usersTable.emailNotifications, true)
    ));

    logger.info(`Streak Check: Found ${atRiskUsers.length} users at risk.`);
    for (const user of atRiskUsers) {
      if (user.email) {
        const name = user.displayName || user.firstName || "Creator";
        sendStreakAtRiskEmail(user.email, name, user.currentStreak).catch(() => {});
      }
    }

    // 2. ACTIVATION & RE-ENGAGEMENT SEQUENCES
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
    const threeDaysAgoStr = threeDaysAgo.toISOString().split('T')[0];

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const sevenDaysAgoStr = sevenDaysAgo.toISOString().split('T')[0];

    // Day 1: Signed up yesterday, 0 generations
    const day1Users = await db.select().from(usersTable).where(
      and(
        sql`DATE(${usersTable.createdAt}) = ${yesterdayStr}`,
        eq(usersTable.totalGenerations, 0)
      )
    );
    for (const u of day1Users) {
      sendSequenceEmail(u.id, "activation", 1).catch(() => {});
    }

    // Day 3: Signed up 3 days ago, 0 generations
    const day3Users = await db.select().from(usersTable).where(
      and(
        sql`DATE(${usersTable.createdAt}) = ${threeDaysAgoStr}`,
        eq(usersTable.totalGenerations, 0)
      )
    );
    for (const u of day3Users) {
      sendSequenceEmail(u.id, "activation", 3).catch(() => {});
    }

    // Day 7: Last generation was 7 days ago
    const day7Users = await db.select().from(usersTable).where(
      and(
        sql`DATE(${usersTable.lastStreakDate}) = ${sevenDaysAgoStr}`,
        gt(usersTable.totalGenerations, 0)
      )
    );
    for (const u of day7Users) {
      sendSequenceEmail(u.id, "reengagement", 7).catch(() => {});
    }

    logger.info("Daily Cron Process completed successfully.");
    return { success: true, processed: { streaks: atRiskUsers.length, day1: day1Users.length, day3: day3Users.length, day7: day7Users.length } };
  } catch (err) {
    logger.error({ err }, "Daily Cron Process failed");
    throw err;
  }
}
