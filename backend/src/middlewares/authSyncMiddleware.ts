import { getAuth } from "@clerk/express";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { ensureReferralCode } from "../routes/referral";

/**
 * Validates the Clerk session and ensures the user is securely registered in Supabase.
 * By keeping this separate from lazy endpoints, we ensure a true Identity Bridge.
 */
export const authSyncMiddleware = async (req: any, res: any, next: any) => {
  try {
    const auth = getAuth(req);
    const userId = auth?.sessionClaims?.userId || auth?.userId;
    
    if (!userId) {
      return next(); // Unauthenticated route, move on
    }

    const uid = userId as string;
    
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
          planTier: "FREE",
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
        import("../lib/WelcomeSequence").then(seq => {
          seq.WelcomeSequence.sendWelcomeToBeta(email, "");
        }).catch(err => console.error("Welcome email dynamic import failed:", err));
      }
    } else {
      const now = new Date();
      let updateData: any = { lastLoginAt: now };
      
      const lastReset = user.lastCreditReset ? new Date(user.lastCreditReset) : null;
      let shouldResetCredits = false;
      
      if (lastReset) {
        const diffTime = Math.abs(now.getTime() - lastReset.getTime());
        const diffDays = diffTime / (1000 * 60 * 60 * 24);
        if (diffDays >= 30) {
          shouldResetCredits = true;
        }
      } else {
        shouldResetCredits = true;
      }

      if (shouldResetCredits) {
        const planTier = (user.planTier as string) || "FREE";
        const tierCredits: Record<string, number> = {
          FREE: 5,
          STARTER: 20,
          CREATOR: 60,
          INFINITY: 9999
        };
        
        updateData.creditsRemaining = tierCredits[planTier] || 5;
        updateData.lastCreditReset = now;
      }

      const [updatedUser] = await db.update(usersTable)
        .set(updateData)
        .where(eq(usersTable.id, uid))
        .returning();
        
      user = updatedUser;
    }

    req.user = user;
    
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
