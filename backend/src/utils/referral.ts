import { eq, and, sql, isNull } from "drizzle-orm";
import { db, usersTable, referralsTable } from "@workspace/db";
import crypto from "crypto";

export function generateReferralCode(): string {
  return crypto.randomBytes(4).toString("hex").toUpperCase();
}

export async function ensureReferralCode(userId: string): Promise<string> {
  const [user] = await db.select({ referralCode: usersTable.referralCode })
    .from(usersTable)
    .where(eq(usersTable.id, userId));

  if (user?.referralCode) return user.referralCode;

  const code = generateReferralCode();
  try {
    const [updated] = await db.update(usersTable)
      .set({ referralCode: code })
      .where(and(
        eq(usersTable.id, userId),
        isNull(usersTable.referralCode)
      ))
      .returning({ referralCode: usersTable.referralCode });
    
    if (updated?.referralCode) return updated.referralCode;
    
    const [retryUser] = await db.select({ referralCode: usersTable.referralCode })
      .from(usersTable)
      .where(eq(usersTable.id, userId));
    return retryUser?.referralCode || code;
  } catch (err) {
    console.error(`[Referral] Failed to save code for ${userId}:`, err);
    // Re-fetch in case another concurrent request already saved a code
    try {
      const [retryFetch] = await db.select({ referralCode: usersTable.referralCode })
        .from(usersTable).where(eq(usersTable.id, userId));
      if (retryFetch?.referralCode) return retryFetch.referralCode;
    } catch { /* ignore */ }
    // Only return temp code as absolute last resort — log as critical
    console.error(`[CRITICAL] Could not persist referral code for user ${userId}. User will see inconsistent codes.`);
    return code;
  }
}

export async function grantReferralReward(referredUserId: string): Promise<void> {
  const [referredUser] = await db.select({
    referralUsedCode: usersTable.referralUsedCode,
    trialEndsAt: usersTable.trialEndsAt,
    subscriptionStatus: usersTable.subscriptionStatus,
  }).from(usersTable).where(eq(usersTable.id, referredUserId));

  if (!referredUser?.referralUsedCode) return;

  const [referrerUser] = await db.select({ 
    id: usersTable.id, 
    trialEndsAt: usersTable.trialEndsAt,
    subscriptionStatus: usersTable.subscriptionStatus
  })
    .from(usersTable)
    .where(eq(usersTable.referralCode, referredUser.referralUsedCode));

  if (!referrerUser) return;
  if (referrerUser.id === referredUserId) return;

  const referralId = crypto.randomUUID();
  const fifteenDays = 15 * 24 * 60 * 60 * 1000;
  const now = new Date();

  await db.transaction(async (tx) => {
    try {
      // Update the existing pending referral to mark it as rewarded
      const [updatedReferral] = await tx.update(referralsTable)
        .set({ rewardGranted: true })
        .where(and(
          eq(referralsTable.referredUserId, referredUserId),
          eq(referralsTable.rewardGranted, false)
        ))
        .returning({ id: referralsTable.id });

      if (!updatedReferral) {
        // Either already rewarded or no pending referral exists — both are fine
        console.log(`[Referral] No pending referral to reward for: ${referredUserId}`);
        return;
      }

      const referredTrialBase = referredUser.trialEndsAt && referredUser.trialEndsAt > now
        ? referredUser.trialEndsAt
        : now;
      const referrerTrialBase = referrerUser.trialEndsAt && referrerUser.trialEndsAt > now
        ? referrerUser.trialEndsAt
        : now;

      // Referred user reward
      if (referredUser.subscriptionStatus === "active") {
        await tx.update(usersTable)
          .set({ generationsRemaining: sql`${usersTable.generationsRemaining} + 10` })
          .where(eq(usersTable.id, referredUserId));
      } else {
        await tx.update(usersTable)
          .set({ trialEndsAt: new Date(referredTrialBase.getTime() + fifteenDays) })
          .where(eq(usersTable.id, referredUserId));
      }

      // Referrer user reward
      if (referrerUser.subscriptionStatus === "active") {
        await tx.update(usersTable)
          .set({ generationsRemaining: sql`${usersTable.generationsRemaining} + 20` })
          .where(eq(usersTable.id, referrerUser.id));
      } else {
        await tx.update(usersTable)
          .set({ trialEndsAt: new Date(referrerTrialBase.getTime() + fifteenDays) })
          .where(eq(usersTable.id, referrerUser.id));
      }
    } catch (err) {
      console.error("Transactional grantReferralReward error:", err);
      // Drizzle handles rollback on error in transaction callback
      throw err;
    }
  });
}
