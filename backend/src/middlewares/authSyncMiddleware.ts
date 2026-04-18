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
    
    if (!user) {
      // First-time sync logic
      const email = typeof auth.sessionClaims?.email === "string" 
                      ? auth.sessionClaims.email 
                      : null;
                      
      [user] = await db.insert(usersTable)
        .values({ 
          id: uid, 
          email: email,
          lastLoginAt: new Date()
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
      // Update last active time for tracking retention
      // Optional: throttle this to once per day if high traffic
      await db.update(usersTable)
        .set({ lastLoginAt: new Date() })
        .where(eq(usersTable.id, uid));
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
