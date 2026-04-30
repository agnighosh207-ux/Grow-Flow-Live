import { getAuth } from "@clerk/express";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { ensureReferralCode } from "../routes/referral";
import { WelcomeSequence } from "../lib/WelcomeSequence";

const syncCache = new Map<string, number>();

setInterval(() => {
  const now = Date.now();
  for (const [uid, timestamp] of syncCache.entries()) {
    if (now - timestamp > 60000) {
      syncCache.delete(uid);
    }
  }
}, 10 * 60 * 1000);

/**
 * Validates the Clerk session and ensures the user is securely registered in Supabase.
 * By keeping this separate from lazy endpoints, we ensure a true Identity Bridge.
 */
export const authSyncMiddleware = async (req: any, res: any, next: any) => {
  try {
    if (req.path.startsWith("/api/health") || req.path.startsWith("/api/webhooks")) {
      return next();
    }

    const auth = getAuth(req);
    const userId = auth?.sessionClaims?.userId || auth?.userId;
    
    if (!userId) {
      return next(); // Unauthenticated route, move on
    }

    const uid = userId as string;
    
    if (syncCache.has(uid) && Date.now() - syncCache.get(uid)! < 60000) {
      req.userId = uid;
      return next();
    }
    
    // Attach verified user ID to request
    req.userId = uid;

    // Fast sync: check if user exists
    let [user] = await db.select().from(usersTable).where(eq(usersTable.id, uid));
    
    // KILL SWITCH PRE-CHECK
    if (user?.isBanned) {
      return res.status(403).json({ 
        error: "ACCESS_DENIED", 
        message: "Account suspended for Fair Use violations. Contact growflowai.space/support." 
      });
    }
    
    if (!user) {
      // First-time sync logic
      const email = typeof auth.sessionClaims?.email === "string" 
                      ? auth.sessionClaims.email 
                      : null;
                      
      [user] = await db.insert(usersTable)
        .values({ 
          id: uid, 
          email: email,
          lastLoginAt: new Date(),
          planTier: "FREE", planType: "free",
          generationsRemaining: 5,
          creditsRemaining: 5,
          isBetaUser: false,
          lastCreditReset: new Date()
        })
        .returning();

      // Ensure their referral code is created atomically right after sync
      if (!user.referralCode) {
        await ensureReferralCode(uid);
      }
      
      if (email) {
        await WelcomeSequence.sendWelcomeToBeta(email, "").catch(err => console.error("sendWelcomeToBeta error:", err));
      }
    } else {
      const now = new Date();
      let updateData: any = { lastLoginAt: now };
      
      const anchorDate = user.trialStartDate || user.createdAt || now;
      const msIn30Days = 30 * 24 * 60 * 60 * 1000;
      const elapsed = now.getTime() - anchorDate.getTime();
      const intervals = Math.floor(elapsed / msIn30Days);
      const currentCycleStart = new Date(anchorDate.getTime() + intervals * msIn30Days);
      
      let shouldResetCredits = false;
      if (!user.lastCreditReset || new Date(user.lastCreditReset).getTime() < currentCycleStart.getTime()) {
        shouldResetCredits = true;
      }

      if (shouldResetCredits) {
        const planTier = (user.planTier as string) || (user.planType ? user.planType.toUpperCase() : "FREE");
        const tierCredits: Record<string, number> = {
          FREE: 5,
          STARTER: 20,
          CREATOR: 100,
          INFINITY: 9999
        };
        
        updateData.generationsRemaining = tierCredits[planTier] || 5;
        updateData.lastCreditReset = currentCycleStart;
      }

      const [updatedUser] = await db.update(usersTable)
        .set(updateData)
        .where(eq(usersTable.id, uid))
        .returning();
        
      user = updatedUser;
    }

    req.user = user;
    syncCache.set(uid, Date.now());
    
    // Note: To make RLS work with Drizzle in the identical connection pool,
    // you would typically wrap subsequent queries:
    // await db.execute(sql`set default_transaction_isolation = 'read committed'; set LOCAL request.jwt.claim.sub = ${userId};`);
    
    next();
  } catch (err) {
    console.error("Auth Sync Error:", err);
    // Don't kill the request if it's just a sync logging issue, but be safe
    next();
  }
};
