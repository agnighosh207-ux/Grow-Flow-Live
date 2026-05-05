import { Router, type IRouter } from "express";
import { eq, and, count, sql, inArray } from "drizzle-orm";
import { db, usersTable, referralsTable } from "@workspace/db";
import crypto from "crypto";
import { requireAuth } from "../../middlewares/planMiddleware";
import { ensureReferralCode } from "../../utils/referral";

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
    console.log(`[REFERRAL_ROUTE] User ${req.userId} attempting to claim code: ${normalizedCode}`);
    
    await db.transaction(async (tx) => {
      const [referrer] = await tx.select({ id: usersTable.id })
        .from(usersTable)
        .where(eq(usersTable.referralCode, normalizedCode));

      if (!referrer) throw new Error("Invalid referral code");
      if (referrer.id === req.userId) throw new Error("Self-referral not allowed");

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

    console.log(`[REFERRAL_ROUTE] User ${req.userId} successfully claimed code: ${normalizedCode}`);
    res.json({ success: true, message: "Referral code applied! Bonus will be granted after subscription." });
  } catch (err: any) {
    console.error(`[REFERRAL_ROUTE_ERROR] Claim failed for ${req.userId}:`, err.message);
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
    console.error("[REFERRAL_ROUTE_ERROR] popup-seen failure:", err);
    res.status(500).json({ error: "Failed to update status" });
  }
});

/**
 * Fetches comprehensive referral information for the user.
 * Wrapped in strict try/catch to ensure frontend always receives valid JSON.
 */
router.get("/info", requireAuth, async (req: any, res): Promise<void> => {
  try {
    console.log(`[REFERRAL_ROUTE] Fetching info for user ${req.userId}`);
    
    // Ensure code exists (aggressive persistence check)
    const code = await ensureReferralCode(req.userId);

    const [userRow] = await db.select({ 
      hasSeenReferralPopup: usersTable.hasSeenReferralPopup,
      referralUsedCode: usersTable.referralUsedCode,
    })
      .from(usersTable)
      .where(eq(usersTable.id, req.userId));

    let appUrl = process.env.FRONTEND_URL || "https://growflowai.space";
    // Force HTTPS for production domain
    if (appUrl.includes("growflowai.space")) {
      appUrl = appUrl.replace("http://", "https://");
      if (!appUrl.startsWith("https://")) {
        appUrl = "https://" + appUrl.replace(/^\/+/, "");
      }
    }
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
    });

  } catch (err) {
    console.error(`[REFERRAL_ROUTE_CRITICAL] Info endpoint failed for ${req.userId}:`, err);
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
