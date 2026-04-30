import { getAuth } from "@clerk/express";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
// Dynamic import used below to prevent circular dependency with referral routes
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
      return next(); 
    }

    const uid = userId as string;
    
    if (syncCache.has(uid) && Date.now() - syncCache.get(uid)! < 60000) {
      req.userId = uid;
      // Re-attach impersonated user if it exists in cache
      if (req.headers["x-impersonate-user"]) {
        const adminEmail = process.env.ADMIN_EMAIL;
        const userEmail = auth.sessionClaims?.email;
        if (adminEmail && userEmail === adminEmail) {
          req.userId = req.headers["x-impersonate-user"];
        }
      }
      return next();
    }
    
    req.userId = uid;

    // Fast sync: check if user exists
    let [user] = await db.select().from(usersTable).where(eq(usersTable.id, uid));
    
    // KILL SWITCH PRE-CHECK
    if (user?.isBanned) {
      return res.status(403).json({ 
        error: "ACCESS_DENIED", 
        message: "Account suspended for Fair Use violations." 
      });
    }
    
    const email = typeof auth.sessionClaims?.email === "string" 
                    ? auth.sessionClaims.email 
                    : null;

    if (!user) {
      [user] = await db.insert(usersTable)
        .values({ 
          id: uid, 
          email: email,
          lastLoginAt: new Date(),
          planTier: "FREE", planType: "free",
          generationsRemaining: 5,
          creditsRemaining: 5,
          isBetaUser: false,
          lastCreditReset: new Date(),
          isAdmin: email === process.env.ADMIN_EMAIL
        })
        .returning();

      if (!user.referralCode) {
        const { ensureReferralCode } = await import("../routes/referral/index.js");
        await ensureReferralCode(uid);
      }
      
      if (email) {
        await WelcomeSequence.sendWelcomeToBeta(email, "").catch(err => console.error("sendWelcomeToBeta error:", err));
      }
    } else {
      const now = new Date();
      let updateData: any = { lastLoginAt: now };
      
      // Keep isAdmin synced with email
      if (email === process.env.ADMIN_EMAIL && !user.isAdmin) {
        updateData.isAdmin = true;
      }

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

    // IMPERSONATION LOGIC
    const impUser = req.headers["x-impersonate-user"];
    if (impUser && user.isAdmin) {
      req.userId = impUser;
      const [targetUser] = await db.select().from(usersTable).where(eq(usersTable.id, impUser));
      if (targetUser) {
        req.user = targetUser;
      } else {
        req.user = user; // Fallback to admin if target not found
      }
    } else {
      req.user = user;
    }

    syncCache.set(uid, Date.now());
    next();
  } catch (err) {
    console.error("Auth Sync Error:", err);
    next();
  }
};
