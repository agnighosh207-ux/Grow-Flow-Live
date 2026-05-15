import { Router, type IRouter } from "express";
import { eq, and, count, sql, inArray, desc } from "drizzle-orm";
import { db, usersTable, referralsTable } from "@workspace/db";
import crypto from "node:crypto";
import { requireAuth } from "../../middlewares/planMiddleware";
import { ensureReferralCode } from "../../utils/referral";
import { logger } from "../../lib/logger";

const router: IRouter = Router();

router.get("/test", (req, res) => res.json({ ok: true }));

/**
 * Applies a referral code to the current user.
 */
router.post("/claim", requireAuth, async (req: any, res): Promise<void> => {
  const { code } = req.body as { code?: string };

  if (!code || typeof code !== "string") {
    res.status(400).json({ error: "Missing referral code" });
    return;
  }

  const normalizedCode = code.trim().toUpperCase();

  try {
    logger.info({ userId: req.userId, code: normalizedCode }, `[REFERRAL_ROUTE] User attempting to claim code`);
    
    await db.transaction(async (tx) => {
      const [referrer] = await tx.select({ id: usersTable.id })
        .from(usersTable)
        .where(eq(usersTable.referralCode, normalizedCode));

      if (!referrer) throw new Error("Invalid referral code");
      if (referrer.id === req.userId) throw new Error("Cannot use your own referral code");

      const [currentUser] = await tx.select({ referralUsedCode: usersTable.referralUsedCode })
        .from(usersTable)
        .where(eq(usersTable.id, req.userId))
        .for("update");

      if (currentUser?.referralUsedCode) {
        throw new Error("Referral code already applied");
      }

      await tx.update(usersTable)
        .set({ referralUsedCode: normalizedCode })
        .where(eq(usersTable.id, req.userId));

      await tx.insert(referralsTable).values({
        id: crypto.randomUUID(),
        referrerUserId: referrer.id,
        referredUserId: req.userId,
        rewardGranted: false,
        rewardSeen: false,
      }).onConflictDoNothing();
    });

    logger.info({ userId: req.userId, code: normalizedCode }, `[REFERRAL_ROUTE] User successfully claimed code`);
    res.json({ success: true, message: "Referral code applied! Bonus will be granted after subscription." });
  } catch (err: any) {
    logger.error({ err: err.message, userId: req.userId }, `[REFERRAL_ROUTE_ERROR] Claim failed`);
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
    logger.error({ err, userId: req.userId }, "[REFERRAL_ROUTE_ERROR] popup-seen failure");
    res.status(500).json({ error: "Failed to update status" });
  }
});

/**
 * Fetches comprehensive referral information for the user.
 * Wrapped in strict try/catch to ensure frontend always receives valid JSON.
 */
router.get("/info", requireAuth, async (req: any, res): Promise<void> => {
  try {
    logger.info({ userId: req.userId }, `[REFERRAL_ROUTE] Fetching info for user`);
    
    // Ensure code exists (aggressive persistence check)
    const code = await ensureReferralCode(req.userId);

    const [userRow] = await db.select({ 
      hasSeenReferralPopup: usersTable.hasSeenReferralPopup,
      referralUsedCode: usersTable.referralUsedCode,
    })
      .from(usersTable)
      .where(eq(usersTable.id, req.userId));

    const shareableLink = `https://growflowai.space/sign-up?ref=${code}`;

    const [referralStats] = await db
      .select({ 
        successful: sql<number>`count(CASE WHEN ${referralsTable.rewardGranted} = true THEN 1 END)`,
        total: count()
      })
      .from(referralsTable)
      .where(eq(referralsTable.referrerUserId, req.userId));

    const successfulReferrals = Number(referralStats?.successful ?? 0);
    const totalReferrals = Number(referralStats?.total ?? 0);

    const unseenReferrals = await db.select({ id: referralsTable.id })
      .from(referralsTable)
      .where(and(
        eq(referralsTable.referrerUserId, req.userId),
        eq(referralsTable.rewardGranted, true),
        eq(referralsTable.rewardSeen, false)
      ));

    const hasNewReward = unseenReferrals.length > 0;

    if (hasNewReward) {
      const unseenIds = unseenReferrals.map(r => r.id);
      await db.update(referralsTable)
        .set({ rewardSeen: true })
        .where(inArray(referralsTable.id, unseenIds));
    }

    const referrals = await db.select({
      id: usersTable.id,
      username: usersTable.username,
      displayName: usersTable.displayName,
      avatarUrl: usersTable.avatarUrl,
      createdAt: referralsTable.createdAt,
      rewardGranted: referralsTable.rewardGranted
    })
    .from(referralsTable)
    .innerJoin(usersTable, eq(referralsTable.referredUserId, usersTable.id))
    .where(eq(referralsTable.referrerUserId, req.userId))
    .orderBy(desc(referralsTable.createdAt));

    res.json({
      referralCode: code,
      shareableLink,
      successfulReferrals,
      totalReferrals,
      totalBonusDays: successfulReferrals * 15,
      totalBonusCredits: successfulReferrals * 20,
      hasNewReward,
      hasSeenReferralPopup: userRow?.hasSeenReferralPopup ?? false,
      hasAppliedCode: !!userRow?.referralUsedCode,
      referrals: referrals || []
    });

  } catch (err) {
    logger.error({ err, userId: req.userId }, `[REFERRAL_ROUTE_CRITICAL] Info endpoint failed`);
    // Provide a valid fallback to prevent frontend "---" or crash
    res.status(500).json({ 
      error: "INTERNAL_ERROR",
      referralCode: "ERROR",
      shareableLink: "#",
      successfulReferrals: 0,
      totalReferrals: 0,
      totalBonusDays: 0,
      totalBonusCredits: 0,
      hasNewReward: false,
      hasSeenReferralPopup: true, // suppress popup on error
      hasAppliedCode: false
    });
  }
});

export default router;
