import { Router, type IRouter } from "express";
import { eq, and, count, sql, inArray } from "drizzle-orm";
import { db, usersTable, referralsTable } from "@workspace/db";
import crypto from "crypto";
import { requireAuth } from "../../middlewares/planMiddleware";
import { ensureReferralCode, grantReferralReward } from "../../utils/referral";

const router: IRouter = Router();


// requireAuth is now centralized in planMiddleware.ts (Flaw 20 fix)

// Referral utility functions moved to backend/src/utils/referral.ts to fix circular dependency risks.

router.get("/test", (req, res) => res.json({ ok: true }));

router.post("/claim", requireAuth, async (req: any, res): Promise<void> => {
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

      // 4. Log the referral (Pending Reward)
      await tx.insert(referralsTable).values({
        id: crypto.randomUUID(),
        referrerUserId: referrer.id,
        referredUserId: req.userId,
        rewardGranted: false, // Wait for payment
        rewardSeen: false,
      }).onConflictDoNothing();
    });

    res.json({ success: true, message: "Referral code applied! Your bonus credits will be granted after your first successful subscription." });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

router.post("/popup-seen", requireAuth, async (req: any, res): Promise<void> => {
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

router.get("/info", requireAuth, async (req: any, res): Promise<void> => {
  try {
    const code = await ensureReferralCode(req.userId);

    const [userRow] = await db.select({ hasSeenReferralPopup: usersTable.hasSeenReferralPopup })
      .from(usersTable)
      .where(eq(usersTable.id, req.userId));

    const appUrl = process.env.FRONTEND_URL || "https://growflowai.space";
    const shareableLink = `${appUrl}/?ref=${code}`;

    const [referralStats] = await db
      .select({ 
        successful: sql<number>`count(CASE WHEN ${referralsTable.rewardGranted} = true THEN 1 END)`,
        total: count()
      })
      .from(referralsTable)
      .where(eq(referralsTable.referrerUserId, req.userId));

    const successfulReferrals = Number(referralStats?.successful ?? 0);
    const totalReferrals = Number(referralStats?.total ?? 0);
    const totalBonusDays = successfulReferrals * 15;
    const totalBonusCredits = successfulReferrals * 20;

    const unseenReferrals = await db.select({ id: referralsTable.id })
      .from(referralsTable)
      .where(and(
        eq(referralsTable.referrerUserId, req.userId),
        eq(referralsTable.rewardGranted, true),
        eq(referralsTable.rewardSeen, false)
      ));

    const hasNewReward = unseenReferrals.length > 0;

    if (hasNewReward && unseenReferrals.length > 0) {
      const unseenIds = unseenReferrals.map(r => r.id);
      await db.update(referralsTable)
        .set({ rewardSeen: true })
        .where(inArray(referralsTable.id, unseenIds));
    }

    res.json({
      referralCode: code,
      shareableLink,
      successfulReferrals,
      totalReferrals,
      totalBonusDays,
      totalBonusCredits,
      hasNewReward,
      hasSeenReferralPopup: userRow?.hasSeenReferralPopup ?? false,
    });
  } catch (err) {
    console.error("Referral info error:", err);
    res.status(500).json({ error: "Failed to get referral info" });
  }
});

export default router;
