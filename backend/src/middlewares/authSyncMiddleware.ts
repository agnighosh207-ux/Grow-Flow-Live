import { getAuth } from "@clerk/express";
import { db, usersTable, impersonationSessionsTable } from "@workspace/db";
import { eq, and, gt, isNull } from "drizzle-orm";
// Dynamic import used below to prevent circular dependency with referral routes
import { WelcomeSequence } from "../lib/WelcomeSequence";
import { ensureReferralCode } from "../utils/referral";
import { logger } from "../lib/logger";
import { TIER_CREDITS } from "./planMiddleware";

const syncCache = new Map<string, { timestamp: number, user: any }>();

/**
 * Manually invalidate a user's auth cache (e.g. after a ban or plan change)
 */
export const invalidateAuthCache = (userId: string) => {
  syncCache.delete(userId);
};

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
    if (!req.path.startsWith("/api/") || req.path.startsWith("/api/health") || req.path.startsWith("/api/subscription/webhook")) {
      return next();
    }

    const auth = getAuth(req);
    const userId = auth?.sessionClaims?.userId || auth?.userId;
    
    if (!userId) {
      return next(); 
    }

    const uid = userId as string;
    const rawEmail = auth.sessionClaims?.email;
    const emailFromSession: string | null = typeof rawEmail === 'string' ? rawEmail : null;
    const adminEmailFromEnv = process.env.ADMIN_EMAIL;
    
    // Fast sync: check if user exists
    const [userRow] = await db.select().from(usersTable).where(eq(usersTable.id, uid));
    let user = userRow;

    const emailToCheck = emailFromSession || user?.email;
    const isAdminEmail = emailToCheck && adminEmailFromEnv && emailToCheck.toLowerCase() === adminEmailFromEnv.toLowerCase();

    logger.debug({ uid, emailFromSession, isAdminEmail }, "[AUTH_SYNC] Identity bridge check");

    // ─── AUTO-UNBAN ADMINS (Must be before cache check) ─────────────────────
    if ((user?.isBanned) && isAdminEmail) {
       logger.error({ uid, emailToCheck }, "[AUTH] Auto-unbanning admin");
       if (user) user.isBanned = false;
       
       await db.update(usersTable)
         .set({ isBanned: false, violationCount: 0 })
         .where(eq(usersTable.id, uid));
       
       invalidateAuthCache(uid);
    }

    // --- FIX: Remove x-impersonate-user check from fast-cache path to prevent bypass ---
    const cached = syncCache.get(uid);
    if (cached && Date.now() - cached.timestamp < 60000 && !req.headers["x-impersonate-user"]) {
      // Force refresh if this is an admin email but the cache doesn't know it yet
      if (isAdminEmail && !cached.user.isAdmin) {
        syncCache.delete(uid);
      } else {
        req.userId = uid;
        req.user = cached.user;
        return next();
      }
    }
    
    req.userId = uid;

    if (user?.isBanned) {
      return res.status(403).json({ 
        error: "ACCESS_DENIED", 
        message: "Account suspended for Fair Use violations. Contact growflowai.space/support." 
      });
    }

    // --- FIX: Wrap user creation/sync in a transaction with locks ---
    try {
      await db.transaction(async (tx) => {
        if (!user) {
          const emailForNewUser = emailFromSession;
          // Allow through if:
          // 1. Clerk explicitly marks email as verified (email+password signups that clicked the link)
          // 2. email_verified is undefined (OAuth users - Google/GitHub - Clerk guarantees these are verified)
          // 3. This is the admin email
          const emailVerifiedClaim = auth.sessionClaims?.email_verified;
          const isEmailVerified = emailVerifiedClaim === true || emailVerifiedClaim === undefined;

          if (!isEmailVerified && !isAdminEmail) {
            throw new Error("EMAIL_NOT_VERIFIED");
          }

          user = (await tx.insert(usersTable)
            .values({ 
              id: uid, 
              email: emailForNewUser,
              lastLoginAt: new Date(),
              planTier: "FREE", planType: "free",
              generationsRemaining: 5,
              isBetaUser: false,
              lastCreditReset: new Date(),
              isAdmin: Boolean(isAdminEmail)
            })
            .returning())[0];

          if (!user.referralCode) {
            await ensureReferralCode(uid); // Internal handles its own tx if needed, but safe here
          }
          
          if (emailForNewUser) {
            const firstName = auth.sessionClaims?.firstName || "";
            WelcomeSequence.sendWelcomeToBeta(emailForNewUser, firstName as string).catch(() => {});
          }
        } else {
          // Re-fetch with lock
          const [lockedUser] = await tx.select().from(usersTable).where(eq(usersTable.id, uid)).for('update');
          user = lockedUser;

          const now = new Date();
          let updateData: any = { lastLoginAt: now };
          
          if (isAdminEmail && !user.isAdmin) {
            updateData.isAdmin = true;
          }

          const anchorDate = user.trialStartDate || user.createdAt || now;
          const msIn30Days = 30 * 24 * 60 * 60 * 1000;
          const elapsed = now.getTime() - anchorDate.getTime();
          const intervals = Math.floor(elapsed / msIn30Days);
          const currentCycleStart = new Date(anchorDate.getTime() + intervals * msIn30Days);
          
          if (!user.lastCreditReset || new Date(user.lastCreditReset).getTime() < currentCycleStart.getTime() || (isAdminEmail && user.planTier !== "INFINITY")) {
            let planTier = (user.planTier as string) || (user.planType ? user.planType.toUpperCase() : "FREE");
            
            if (isAdminEmail) {
              planTier = "INFINITY";
              updateData.planTier = "INFINITY";
              updateData.planType = "infinity";
            }

            updateData.generationsRemaining = TIER_CREDITS[planTier] || 5;
            updateData.lastCreditReset = currentCycleStart;
            if (planTier !== "FREE" && user.planType === "free") {
              updateData.planType = planTier.toLowerCase();
            }
          }

          const [updatedUser] = await tx.update(usersTable)
            .set(updateData)
            .where(eq(usersTable.id, uid))
            .returning();
            
          user = updatedUser;
        }
      });
    } catch (err: any) {
      if (err.message === "EMAIL_NOT_VERIFIED") {
        return res.status(403).json({ error: "EMAIL_NOT_VERIFIED", message: "Please verify your email." });
      }
      throw err;
    }

    if (res.headersSent) return;

    // --- SECURE IMPERSONATION LOGIC ---
    const impUser = req.headers["x-impersonate-user"];
    const adminEmail = process.env.ADMIN_EMAIL;
    const actualUserEmail = emailFromSession || auth.sessionClaims?.email;
    const isActualAdmin = actualUserEmail && adminEmail && actualUserEmail === adminEmail;

    // --- H-6 FIX: Prevent self-impersonation from triggering session checks ---
    if (impUser && impUser !== uid && (user.isAdmin || isActualAdmin)) {
      const [session] = await db.select().from(impersonationSessionsTable).where(
        and(
          eq(impersonationSessionsTable.adminId, uid),
          eq(impersonationSessionsTable.targetUserId, impUser as string),
          gt(impersonationSessionsTable.expiresAt, new Date()),
          isNull(impersonationSessionsTable.endedAt)
        )
      );

      if (!session) {
        logger.error({ uid, impUser }, "[AUTH] Unauthorized or invalid impersonation attempt");
        return res.status(403).json({ error: "Invalid or expired impersonation session" });
      }

      req.userId = impUser as string;
      const [targetUser] = await db.select().from(usersTable).where(eq(usersTable.id, req.userId));
      if (targetUser) {
        req.user = targetUser;
      } else {
        req.user = user;
      }
    } else {
      req.user = user;
      
      // --- L-10 FIX: Add max-size guard to prevent unbounded growth ---
      if (syncCache.size > 5000) {
        logger.warn("[AUTH] syncCache exceeded 5000 entries, performing emergency flush");
        syncCache.clear();
      }
      
      syncCache.set(uid, { timestamp: Date.now(), user });
    }

    next();
  } catch (err: any) {
    logger.error({ 
      err: err?.message || String(err),
      stack: err?.stack,
      path: req.path,
      userId: req.userId
    }, "Auth Sync Error Detail");
    next(err);
  }
};
