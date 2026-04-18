import { Router, type IRouter } from "express";
import { getAuth } from "@clerk/express";
import { eq, sql } from "drizzle-orm";
import { db, usersTable, referralsTable } from "@workspace/db";
import crypto from "crypto";

const router: IRouter = Router();

const requireAuth = (req: any, res: any, next: any) => {
  const auth = getAuth(req);
  const userId = auth?.sessionClaims?.userId || auth?.userId;
  if (!userId) { return res.status(401).json({ error: "Unauthorized" }); }
  req.userId = userId;
  next();
};

router.post("/auth/complete-onboarding", requireAuth, async (req: any, res): Promise<void> => {
  const { referralCode } = req.body as { referralCode?: string };

  // Always proceed with completing onboarding, referral is optional
  const normalizedCode = referralCode ? referralCode.trim().toUpperCase() : null;

  try {
    if (normalizedCode) {
      await db.transaction(async (tx) => {
        // 1. Find the referrer
        const [referrer] = await tx.select({ id: usersTable.id, planExpiry: usersTable.planExpiry })
          .from(usersTable)
          .where(eq(usersTable.referralCode, normalizedCode));

        if (!referrer) {
           // Invalid code, silent failure on reward
           return;
        }
        if (referrer.id === req.userId) {
           // Self-referral, silent failure
           return;
        }

        // 2. Check if current user already used a code (to prevent double dipping)
        const [currentUser] = await tx.select({ referralUsedCode: usersTable.referralUsedCode, planExpiry: usersTable.planExpiry })
          .from(usersTable)
          .where(eq(usersTable.id, req.userId))
          .for("update"); // Lock for update to prevent concurrent race conditions

        if (currentUser?.referralUsedCode) {
          // Already used, fail silently
          return;
        }

        // 3. Mark the code as used by current user
        await tx.update(usersTable)
          .set({ referralUsedCode: normalizedCode })
          .where(eq(usersTable.id, req.userId));

        // 4. Calculate expirations (15 days)
        const fifteenDays = 15 * 24 * 60 * 60 * 1000;
        const now = new Date();
        
        const currentUserExpiry = currentUser?.planExpiry && currentUser.planExpiry > now 
            ? new Date(currentUser.planExpiry.getTime() + fifteenDays)
            : new Date(now.getTime() + fifteenDays);
            
        const referrerExpiry = referrer?.planExpiry && referrer.planExpiry > now
            ? new Date(referrer.planExpiry.getTime() + fifteenDays)
            : new Date(now.getTime() + fifteenDays);

        // 5. Upgrade both users to infinity for 15 days
        await tx.update(usersTable)
          .set({ 
            planType: 'infinity',
            subscriptionStatus: 'active',
            planExpiry: referrerExpiry 
          })
          .where(eq(usersTable.id, referrer.id));
          
        await tx.update(usersTable)
          .set({ 
            planType: 'infinity',
            subscriptionStatus: 'active',
            planExpiry: currentUserExpiry 
          })
          .where(eq(usersTable.id, req.userId));

        // 6. Log the referral
        await tx.insert(referralsTable).values({
          id: crypto.randomUUID(),
          referrerUserId: referrer.id,
          referredUserId: req.userId,
          rewardGranted: true,
          rewardSeen: false,
        }).onConflictDoNothing();
      });
    }

    res.json({ success: true });
  } catch (err: any) {
    console.error("Onboarding error:", err);
    res.status(500).json({ error: "Failed to complete onboarding" });
  }
});

export default router;
