import crypto from "crypto";
import { logger } from "../lib/logger";
import { db, usersTable, referralsTable } from "@workspace/db";
import { eq, and, isNull, sql } from "drizzle-orm";

export function generateReferralCode(): string {
  return crypto.randomBytes(4).toString("hex").toUpperCase();
}

/**
 * Ensures a user has a referral code.
 * Implements aggressive error logging to catch database constraint failures.
 */
export async function ensureReferralCode(userId: string, tx?: any): Promise<string> {
  const client = tx || db;
  try {
    // 1. Check for existing code
    const [user] = await client.select({ referralCode: usersTable.referralCode })
      .from(usersTable)
      .where(eq(usersTable.id, userId));

    if (user?.referralCode) {
      return user.referralCode;
    }

    // 2. Generate and attempt to persist a new code
    const code = generateReferralCode();
    logger.info(`[REFERRAL_DEBUG] Generating new code ${code} for user ${userId}`);

    const [updated] = await client.update(usersTable)
      .set({ referralCode: code })
      .where(and(
        eq(usersTable.id, userId),
        isNull(usersTable.referralCode)
      ))
      .returning({ referralCode: usersTable.referralCode });
    
    if (updated?.referralCode) {
      logger.info(`[REFERRAL_DEBUG] Successfully persisted code ${code} for user ${userId}`);
      return updated.referralCode;
    }

    // 3. If update failed (e.g. concurrent request already set it), re-fetch
    logger.warn(`[REFERRAL_DEBUG] Update returned no result for ${userId}, performing re-fetch.`);
    const [retryUser] = await client.select({ referralCode: usersTable.referralCode })
      .from(usersTable)
      .where(eq(usersTable.id, userId));
    
    if (retryUser?.referralCode) {
      return retryUser.referralCode;
    }

    throw new Error("Persist failed: No code returned after update or retry.");

  } catch (err) {
    logger.error({ err, userId }, `[REFERRAL_CRITICAL_FAILURE] Error in ensureReferralCode`);
    
    // Attempt one last emergency fetch
    try {
      const [finalFetch] = await client.select({ referralCode: usersTable.referralCode })
        .from(usersTable).where(eq(usersTable.id, userId));
      if (finalFetch?.referralCode) return finalFetch.referralCode;
    } catch (e) {
      logger.error({ err: e, userId }, `[REFERRAL_CRITICAL_FAILURE] Emergency fetch also failed`);
    }

    // Return a temporary code to prevent UI crash, but log it as a desync event
    const tempCode = `ERR-${generateReferralCode()}`;
    logger.error({ userId, tempCode }, `[REFERRAL_DESYNC] Returning temporary code. THIS WILL NOT BE PERSISTED.`);
    return tempCode;
  }
}

export async function grantReferralReward(referredUserId: string): Promise<void> {
  try {
    const [referredUser] = await db.select({
      referralUsedCode: usersTable.referralUsedCode,
      trialEndsAt: usersTable.trialEndsAt,
      subscriptionStatus: usersTable.subscriptionStatus,
    }).from(usersTable).where(eq(usersTable.id, referredUserId));

    if (!referredUser?.referralUsedCode) {
      logger.info({ referredUserId }, `[REFERRAL_REWARD] User did not use a referral code. Skipping reward.`);
      return;
    }

    const [referrerUser] = await db.select({ 
      id: usersTable.id, 
      trialEndsAt: usersTable.trialEndsAt,
      subscriptionStatus: usersTable.subscriptionStatus
    })
      .from(usersTable)
      .where(eq(usersTable.referralCode, referredUser.referralUsedCode));

    if (!referrerUser) {
      logger.warn({ referredUserId, code: referredUser.referralUsedCode }, `[REFERRAL_REWARD] Referrer with code not found`);
      return;
    }

    if (referrerUser.id === referredUserId) {
      logger.error({ referredUserId }, `[REFERRAL_REWARD] Potential fraud: Self-referral detected`);
      return;
    }

    const fifteenDays = 15 * 24 * 60 * 60 * 1000;
    const now = new Date();

    await db.transaction(async (tx: any) => {
      // Mark referral as rewarded
      const [updatedReferral] = await tx.update(referralsTable)
        .set({ rewardGranted: true })
        .where(and(
          eq(referralsTable.referredUserId, referredUserId),
          eq(referralsTable.rewardGranted, false)
        ))
        .returning({ id: referralsTable.id });

      if (!updatedReferral) {
        logger.info({ referredUserId }, `[REFERRAL_REWARD] No pending referral found or already rewarded`);
        return;
      }

      const referredTrialBase = referredUser.trialEndsAt && referredUser.trialEndsAt > now
        ? referredUser.trialEndsAt
        : now;
      const referrerTrialBase = referrerUser.trialEndsAt && referrerUser.trialEndsAt > now
        ? referrerUser.trialEndsAt
        : now;

      // Apply rewards
      if (referredUser.subscriptionStatus === "active") {
        await tx.update(usersTable)
          .set({ generationsRemaining: sql`${usersTable.generationsRemaining} + 10` })
          .where(eq(usersTable.id, referredUserId));
      } else {
        await tx.update(usersTable)
          .set({ trialEndsAt: new Date(referredTrialBase.getTime() + fifteenDays) })
          .where(eq(usersTable.id, referredUserId));
      }

      if (referrerUser.subscriptionStatus === "active") {
        await tx.update(usersTable)
          .set({ generationsRemaining: sql`${usersTable.generationsRemaining} + 20` })
          .where(eq(usersTable.id, referrerUser.id));
      } else {
        await tx.update(usersTable)
          .set({ trialEndsAt: new Date(referrerTrialBase.getTime() + fifteenDays) })
          .where(eq(usersTable.id, referrerUser.id));
      }
      logger.info({ referrerId: referrerUser.id, referredUserId }, `[REFERRAL_REWARD] Successfully granted rewards for referral`);
    });
  } catch (err) {
    logger.error({ err, referredUserId }, "[REFERRAL_REWARD_ERROR] Failed to grant referral reward");
    throw err;
  }
}
