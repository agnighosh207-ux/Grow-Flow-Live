import { Router, type IRouter } from "express";
import { getAuth } from "@clerk/express";
import { eq, and, count, sql } from "drizzle-orm";
import { db, usersTable, referralsTable } from "@workspace/db";
import crypto from "crypto";

const router: IRouter = Router();

const requireAuth = (req: any, res: any, next: any) => {
  const auth = getAuth(req);
  const userId = auth?.sessionClaims?.userId || auth?.userId;
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }
  req.userId = userId;
  next();
};

function generateReferralCode(): string {
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
  const fifteenDays = 7 * 24 * 60 * 60 * 1000;
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
      tx.rollback();
    }
  });
}

router.post("/referral/claim", requireAuth, async (req: any, res): Promise<void> => {
  const { code } = req.body as { code?: string };

  if (!code || typeof code !== "string") {
    res.status(400).json({ error: "Missing referral code" });
    return;
  }

  const normalizedCode = code.trim().toUpperCase();

  try {
    await db.transaction(async (tx) => {
      // 1. Find the referrer
      const [referrer] = await tx.select({ id: usersTable.id })
        .from(usersTable)
        .where(eq(usersTable.referralCode, normalizedCode));

      if (!referrer) throw new Error("Invalid referral code");
      if (referrer.id === req.userId) throw new Error("Self-referral not allowed");

      // 2. Check if current user already used a code
      const [currentUser] = await tx.select({ referralUsedCode: usersTable.referralUsedCode })
        .from(usersTable)
        .where(eq(usersTable.id, req.userId))
        .for("update"); // Lock for update to prevent concurrent race conditions

      if (currentUser?.referralUsedCode) {
        throw new Error("Referral code already applied");
      }

      // 3. Mark the code as used by current user
      await tx.update(usersTable)
        .set({ referralUsedCode: normalizedCode })
        .where(eq(usersTable.id, req.userId));

      // 4. Grant +10 generations to Referrer and +5 to Current User (Referral logic from prompt)
      // "Invite 1 friend, get 10 generations."
      await tx.update(usersTable)
        .set({ generationsRemaining: sql`${usersTable.generationsRemaining} + 10` })
        .where(eq(usersTable.id, referrer.id));
        
      await tx.update(usersTable)
        .set({ generationsRemaining: sql`${usersTable.generationsRemaining} + 5` })
        .where(eq(usersTable.id, req.userId));

      // 5. Log the referral
      await tx.insert(referralsTable).values({
        id: crypto.randomUUID(),
        referrerUserId: referrer.id,
        referredUserId: req.userId,
        rewardGranted: true,
        rewardSeen: false,
      }).onConflictDoNothing();
    });

    res.json({ success: true, message: "Referral code applied successfully. +5 generations granted!" });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

router.post("/referral/popup-seen", requireAuth, async (req: any, res): Promise<void> => {
  try {
    await db.update(usersTable)
      .set({ hasSeenReferralPopup: true })
      .where(eq(usersTable.id, req.userId));
    res.json({ success: true });
  } catch (err) {
    console.error("popup-seen error:", err);
    res.status(500).json({ error: "Failed to update popup status" });
  }
});

router.get("/referral/info", requireAuth, async (req: any, res): Promise<void> => {
  try {
    const code = await ensureReferralCode(req.userId);

    const [userRow] = await db.select({ hasSeenReferralPopup: usersTable.hasSeenReferralPopup })
      .from(usersTable)
      .where(eq(usersTable.id, req.userId));

    const shareableLink = `?ref=${code}`;

    const [referralStats] = await db
      .select({ total: count() })
      .from(referralsTable)
      .where(and(
        eq(referralsTable.referrerUserId, req.userId),
        eq(referralsTable.rewardGranted, true)
      ));

    const successfulReferrals = Number(referralStats?.total ?? 0);
    const totalBonusDays = successfulReferrals * 15;

    const unseenReferrals = await db.select({ id: referralsTable.id })
      .from(referralsTable)
      .where(and(
        eq(referralsTable.referrerUserId, req.userId),
        eq(referralsTable.rewardGranted, true),
        eq(referralsTable.rewardSeen, false)
      ));

    const hasNewReward = unseenReferrals.length > 0;

    if (hasNewReward) {
      for (const r of unseenReferrals) {
        await db.update(referralsTable)
          .set({ rewardSeen: true })
          .where(eq(referralsTable.id, r.id));
      }
    }

    res.json({
      referralCode: code,
      shareableLink,
      successfulReferrals,
      totalBonusDays,
      hasNewReward,
      hasSeenReferralPopup: userRow?.hasSeenReferralPopup ?? false,
    });
  } catch (err) {
    console.error("Referral info error:", err);
    res.status(500).json({ error: "Failed to get referral info" });
  }
});

router.post("/referral/apply", requireAuth, async (req: any, res): Promise<void> => {
  const { code } = req.body as { code?: string };

  if (!code || typeof code !== "string") {
    res.status(400).json({ error: "Missing referral code" });
    return;
  }

  const normalizedCode = code.trim().toUpperCase();

  const [ownerUser] = await db.select({ id: usersTable.id })
    .from(usersTable)
    .where(eq(usersTable.referralCode, normalizedCode));

  if (!ownerUser) {
    res.status(404).json({ error: "Invalid referral code" });
    return;
  }

  if (ownerUser.id === req.userId) {
    res.json({ success: true, message: "Self-referral not allowed" });
    return;
  }

  await db.insert(usersTable)
    .values({ id: req.userId })
    .onConflictDoNothing({ target: usersTable.id });

  const [currentUser] = await db.select({ referralUsedCode: usersTable.referralUsedCode })
    .from(usersTable)
    .where(eq(usersTable.id, req.userId));

  if (currentUser?.referralUsedCode) {
    res.json({ success: true, message: "Referral code already applied" });
    return;
  }

  await db.update(usersTable)
    .set({ referralUsedCode: normalizedCode })
    .where(eq(usersTable.id, req.userId));

  res.json({ success: true, message: "Referral code applied successfully" });
});

export default router;
