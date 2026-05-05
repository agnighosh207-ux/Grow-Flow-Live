import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, usersTable } from "@workspace/db";
import { requireAuth } from "../../middlewares/planMiddleware";
import { invalidateAuthCache } from "../../middlewares/authSyncMiddleware";
import { AuthenticatedRequest } from "../../types";
import { Response } from "express";

const router: IRouter = Router();

// Called by ReferralPopup after onboarding to apply a referral code
// This proxies to the referral/claim logic
router.post("/complete-onboarding", requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { referralCode } = req.body as { referralCode?: string };

  if (!referralCode || typeof referralCode !== "string") {
    res.json({ success: true, message: "No referral code provided — skipped." });
    return;
  }

  const normalizedCode = referralCode.trim().toUpperCase();

  try {
    // Check if user already used a code
    const [currentUser] = await db.select({ referralUsedCode: usersTable.referralUsedCode })
      .from(usersTable).where(eq(usersTable.id, req.userId));

    if (currentUser?.referralUsedCode) {
      res.json({ success: true, message: "Referral code already applied." });
      return;
    }

    // Find referrer
    const [referrer] = await db.select({ id: usersTable.id })
      .from(usersTable).where(eq(usersTable.referralCode, normalizedCode));

    if (!referrer) {
      res.status(400).json({ error: "Invalid referral code" });
      return;
    }

    if (referrer.id === req.userId) {
      res.status(400).json({ error: "You cannot use your own referral code" });
      return;
    }

    // Apply the code
    await db.update(usersTable)
      .set({ referralUsedCode: normalizedCode })
      .where(eq(usersTable.id, req.userId));

    res.json({ success: true, message: "Referral code applied! Your bonus will be granted after your first subscription." });
  } catch (err: any) {
    res.status(500).json({ error: "Failed to apply referral code" });
  }
});

router.post("/sync", requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  invalidateAuthCache(req.userId);
  res.json({ success: true, message: "Auth cache invalidated" });
});

export default router;
