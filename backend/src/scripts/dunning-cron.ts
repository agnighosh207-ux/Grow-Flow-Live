import { db, usersTable } from "@workspace/db";
import { eq, and, isNotNull, lt, gte, gt, isNull } from "drizzle-orm";
import { sendPaymentFailedReminder3Days, sendPaymentFailedReminder7Days } from "../services/email";
import { logger } from "../lib/logger";
import { TIER_CREDITS } from "../middlewares/planMiddleware";

async function runDunningCron() {
  logger.info("[DUNNING] Starting dunning cron job...");
  const now = new Date();
  
  // 3-day reminder: failed more than 72 hours ago
  const threeDaysAgoCutoff = new Date(now.getTime() - 72 * 60 * 60 * 1000);
  // 7-day reminder & downgrade: failed more than 168 hours ago
  const sevenDaysAgoCutoff = new Date(now.getTime() - 168 * 60 * 60 * 1000);

  try {
    // 1. Process 3-day reminders
    const pastDueUsers3d = await db.select()
      .from(usersTable)
      .where(and(
        eq(usersTable.subscriptionStatus, "past_due"),
        eq(usersTable.reminderSent3Day, false),
        isNotNull(usersTable.paymentFailedAt),
        lt(usersTable.paymentFailedAt, threeDaysAgoCutoff),
        gt(usersTable.paymentFailedAt, sevenDaysAgoCutoff),
        isNull(usersTable.dunningReminderSentAt)
      ));

    for (const user of pastDueUsers3d) {
      if (user.email) {
        logger.info({ userId: user.id }, "[DUNNING] Sending 3-day reminder");
        await sendPaymentFailedReminder3Days(user.email, user.planType || "Starter");
        
        await db.update(usersTable)
          .set({ 
            reminderSent3Day: true,
            dunningReminderSentAt: new Date() 
          })
          .where(eq(usersTable.id, user.id));
      }
    }

    // 2. Process 7-day reminders & downgrades
    const pastDueUsers7d = await db.select()
      .from(usersTable)
      .where(and(
        eq(usersTable.subscriptionStatus, "past_due"),
        eq(usersTable.reminderSent7Day, false),
        isNotNull(usersTable.paymentFailedAt),
        lt(usersTable.paymentFailedAt, sevenDaysAgoCutoff)
      ));

    for (const user of pastDueUsers7d) {
      if (user.email) {
        logger.info({ userId: user.id }, "[DUNNING] Sending 7-day reminder and downgrading");
        await sendPaymentFailedReminder7Days(user.email, user.planType || "Starter");
        
        // --- FIX: Use Transaction for Atomic Downgrade (Critical 2 fix) ---
        await db.transaction(async (tx) => {
          await tx.update(usersTable)
            .set({
              planType: "free",
              planTier: "FREE",
              subscriptionStatus: "free",
              reminderSent3Day: false, // Reset for next time if they subscribe again
              reminderSent7Day: false,
              // --- FIX: Use centralized constant (High 3 fix) ---
              generationsRemaining: TIER_CREDITS.FREE || 5, 
              paymentFailedAt: null // Clear flag
            })
            .where(eq(usersTable.id, user.id));
        });
      }
    }

    logger.info("[DUNNING] Dunning cron job completed successfully.");
  } catch (err) {
    logger.error({ err }, "[DUNNING] Error running dunning cron job");
  }
}

runDunningCron().then(() => process.exit(0)).catch(() => process.exit(1));
