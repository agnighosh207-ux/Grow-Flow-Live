import cron from "node-cron";
import { db, usersTable, challengeParticipantsTable } from "@workspace/db";
import { eq, and, gt, sql } from "drizzle-orm";
import { sendStreakAtRiskEmail } from "./email";
import { logger } from "../lib/logger";

export function initCronJobs() {
  // Run every day at 10:00 AM IST (which is 04:30 AM UTC)
  // Cron format: 'minute hour day month day-of-week'
  // 04:30 AM UTC: '30 4 * * *'
  cron.schedule('30 4 * * *', async () => {
    logger.info("Running Streak-at-Risk Notification Cron...");
    
    const today = new Date().toISOString().split('T')[0];
    
    try {
      // Find users with active streaks who haven't generated content today
      // and who have email notifications enabled
      const atRiskUsers = await db.select({
        id: usersTable.id,
        email: usersTable.email,
        displayName: usersTable.displayName,
        firstName: usersTable.firstName,
        currentStreak: usersTable.currentStreak,
        lastStreakDate: usersTable.lastStreakDate,
      })
      .from(usersTable)
      .where(and(
        gt(usersTable.currentStreak, 0),
        sql`${usersTable.lastStreakDate} != ${today}`,
        eq(usersTable.emailNotifications, true)
      ));

      logger.info(`Found ${atRiskUsers.length} users at risk of breaking their streak.`);

      for (const user of atRiskUsers) {
        if (user.email) {
          const name = user.displayName || user.firstName || "Creator";
          await sendStreakAtRiskEmail(user.email, name, user.currentStreak);
          logger.info(`Sent streak reminder to ${user.email}`);
        }
      }
    } catch (err) {
      logger.error({ err }, "Streak-at-Risk Cron failed");
    }
  });

  // Optional: Weekly Leaderboard Reset notification could go here too
  logger.info("Cron jobs initialized successfully.");
}
