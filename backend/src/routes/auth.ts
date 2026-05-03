import { Router, type IRouter } from "express";
import { getAuth } from "@clerk/express";
import { eq, sql } from "drizzle-orm";
import { db, usersTable, referralsTable } from "@workspace/db";
import crypto from "crypto";

const router: IRouter = Router();

import { requireAuth } from "../middlewares/planMiddleware";

router.post("/complete-onboarding", requireAuth, async (req: any, res): Promise<void> => {
  const { referralCode } = req.body as { referralCode?: string };

  // Always proceed with completing onboarding, referral is optional
  const normalizedCode = referralCode ? referralCode.trim().toUpperCase() : null;

  try {
    if (normalizedCode) {
      await db.transaction(async (tx) => {
        // 1. Find the referrer
        const [referrer] = await tx.select({ id: usersTable.id })
          .from(usersTable)
          .where(eq(usersTable.referralCode, normalizedCode));

        if (!referrer || referrer.id === req.userId) return;

        // 2. Check if current user already used a code
        const [currentUser] = await tx.select({ referralUsedCode: usersTable.referralUsedCode })
          .from(usersTable)
          .where(eq(usersTable.id, req.userId))
          .for("update");

        if (currentUser?.referralUsedCode) return;

        // 3. Mark the code as used
        await tx.update(usersTable)
          .set({ referralUsedCode: normalizedCode })
          .where(eq(usersTable.id, req.userId));

        // 4. Log the referral (Pending Reward until they upgrade, or grant immediately if that's the rule)
        // For onboarding, we usually grant immediately to build trust
        const referralId = crypto.randomUUID();
        await tx.insert(referralsTable).values({
          id: referralId,
          referrerUserId: referrer.id,
          referredUserId: req.userId,
          rewardGranted: false, // Let the background worker or next step handle the grant
          rewardSeen: false,
        });
      });
    }

    res.json({ success: true });
  } catch (err: any) {
    console.error("Onboarding error:", err);
    res.status(500).json({ error: "Failed to complete onboarding" });
  }
});

export default router;
