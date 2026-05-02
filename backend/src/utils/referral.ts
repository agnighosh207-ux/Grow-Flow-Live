import { eq, and, sql } from "drizzle-orm";
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

  let attempts = 0;
  while (attempts < 10) {
    const code = generateReferralCode();
    try {
      await db.update(usersTable)
        .set({ referralCode: code })
        .where(eq(usersTable.id, userId));
      return code;
    } catch {
      attempts++;
    }
  }
  throw new Error("Failed to generate unique referral code");
}

export async function grantReferralReward(referredUserId: string): Promise<void> {
  const [referredUser] = await db.select({
    referralUsedCode: usersTable.referralUsedCode,
    trialEndsAt: usersTable.trialEndsAt,
  }).from(usersTable).where(eq(usersTable.id, referredUserId));

  if (!referredUser?.referralUsedCode) return;

  const [referrerUser] = await db.select({ id: usersTable.id, trialEndsAt: usersTable.trialEndsAt })
    .from(usersTable)
    .where(eq(usersTable.referralCode, referredUser.referralUsedCode));

  if (!referrerUser) return;
  if (referrerUser.id === referredUserId) return;

  const referralId = crypto.randomUUID();
  const fifteenDays = 15 * 24 * 60 * 60 * 1000;
  const now = new Date();

  await db.transaction(async (tx) => {
    try {
      await tx.insert(referralsTable).values({
        id: referralId,
        referrerUserId: referrerUser.id,
        referredUserId,
        rewardGranted: true,
        rewardSeen: false,
      }).onConflictDoNothing({ target: referralsTable.referredUserId });

      const [inserted] = await tx.select({ id: referralsTable.id })
        .from(referralsTable)
        .where(and(
          eq(referralsTable.referredUserId, referredUserId),
          eq(referralsTable.id, referralId)
        ));

      if (!inserted) return;

      const referredTrialBase = referredUser.trialEndsAt && referredUser.trialEndsAt > now
        ? referredUser.trialEndsAt
        : now;
      const referrerTrialBase = referrerUser.trialEndsAt && referrerUser.trialEndsAt > now
        ? referrerUser.trialEndsAt
        : now;

      await tx.update(usersTable)
        .set({ 
          trialEndsAt: new Date(referredTrialBase.getTime() + fifteenDays),
          generationsRemaining: sql`${usersTable.generationsRemaining} + 5`
        })
        .where(eq(usersTable.id, referredUserId));

      await tx.update(usersTable)
        .set({ 
          trialEndsAt: new Date(referrerTrialBase.getTime() + fifteenDays),
          generationsRemaining: sql`${usersTable.generationsRemaining} + 10`
        })
        .where(eq(usersTable.id, referrerUser.id));
    } catch (err) {
      console.error("Transactional grantReferralReward error:", err);
      // Drizzle handles rollback on error in transaction callback
      throw err;
    }
  });
}
