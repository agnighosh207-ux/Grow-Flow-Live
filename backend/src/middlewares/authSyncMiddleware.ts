import { getAuth } from "@clerk/express";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
// Dynamic import used below to prevent circular dependency with referral routes
import { WelcomeSequence } from "../lib/WelcomeSequence";
import { ensureReferralCode } from "../utils/referral";
import { logger } from "../lib/logger";

const syncCache = new Map<string, { timestamp: number, user: any }>();

setInterval(() => {
  const now = Date.now();
  for (const [uid, cache] of syncCache.entries()) {
    if (now - cache.timestamp > 60000) {
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
    if (req.path.startsWith("/api/health") || req.path.startsWith("/api/subscription/webhook")) {
      return next();
    }

    const auth = getAuth(req);
    const userId = auth?.sessionClaims?.userId || auth?.userId;
    
    if (!userId) {
      return next(); 
    }

    const uid = userId as string;
    
    const cached = syncCache.get(uid);
    if (cached && Date.now() - cached.timestamp < 60000) {
      req.userId = uid;
      req.user = cached.user;
      // Re-attach impersonated user if it exists in cache
      if (req.headers["x-impersonate-user"]) {
        const adminEmail = process.env.ADMIN_EMAIL;
        const userEmail = auth.sessionClaims?.email;
        if (adminEmail && userEmail === adminEmail) {
          req.userId = req.headers["x-impersonate-user"];
          // Note: We don't cache impersonated req.user for security
          const [targetUser] = await db.select().from(usersTable).where(eq(usersTable.id, req.userId));
          if (targetUser) req.user = targetUser;
        }
      }
      return next();
    }
    
    const rawEmail = auth.sessionClaims?.email;
    const email: string | null = typeof rawEmail === 'string' ? rawEmail : null;

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

    if (!user) {
      // Ensure email is verified before creating a new account (Security/Spam Protection)
      const isEmailVerified = auth.sessionClaims?.email_verified === true;
      const isAdminEmail = email === process.env.ADMIN_EMAIL;

      if (!isEmailVerified && !isAdminEmail) {
        return res.status(403).json({
          error: "EMAIL_NOT_VERIFIED",
          message: "Please verify your email address before using GrowFlow AI."
        });
      }

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

    // --- SECURE IMPERSONATION LOGIC ---
    const impUser = req.headers["x-impersonate-user"];
    const adminEmail = process.env.ADMIN_EMAIL;
    const actualUserEmail = email || auth.sessionClaims?.email;
    const isActualAdmin = actualUserEmail && adminEmail && actualUserEmail === adminEmail;

    if (impUser && (user.isAdmin || isActualAdmin)) {
      req.userId = impUser;
      const [targetUser] = await db.select().from(usersTable).where(eq(usersTable.id, impUser));
      if (targetUser) {
        req.user = targetUser;
        // Don't cache impersonated sessions to avoid leaks
      } else {
        req.user = user;
        syncCache.set(uid, { timestamp: Date.now(), user });
      }
    } else {
      req.user = user;
      syncCache.set(uid, { timestamp: Date.now(), user });
    }

    next();
  } catch (err) {
    logger.error({ err: String(err) }, "Auth Sync Error");
    next(err);
  }
};
