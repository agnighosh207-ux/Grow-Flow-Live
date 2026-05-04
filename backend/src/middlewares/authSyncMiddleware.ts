import { getAuth } from "@clerk/express";
import { db, usersTable, impersonationSessionsTable } from "@workspace/db";
import { eq, and, gt, isNull } from "drizzle-orm";
import { WelcomeSequence } from "../lib/WelcomeSequence";
import { ensureReferralCode } from "../utils/referral";
import { logger } from "../lib/logger";
import { TIER_CREDITS } from "./planMiddleware";

const syncCache = new Map<string, { timestamp: number, user: any }>();

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

export const authSyncMiddleware = async (req: any, res: any, next: any) => {
  try {
    if (!req.path.startsWith("/api/") || req.path.startsWith("/api/health") || req.path.startsWith("/api/subscription/webhook") || req.path.startsWith("/api/public")) {
      return next();
    }

    const auth = getAuth(req);
    const userId = auth?.sessionClaims?.userId || auth?.userId;
    if (!userId) return next();

    const uid = userId as string;
    const rawEmail = auth.sessionClaims?.email;
    const emailFromSession: string | null = typeof rawEmail === 'string' ? rawEmail : null;
    const adminEmailFromEnv = process.env.ADMIN_EMAIL;

    // 1. Fast Cache Check
    const cached = syncCache.get(uid);
    if (cached && Date.now() - cached.timestamp < 60000 && !req.headers["x-impersonate-user"]) {
      req.userId = uid;
      req.user = cached.user;
      return next();
    }

    // 2. DB Select
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, uid));
    const emailToCheck = emailFromSession || user?.email;
    const isAdminEmail = emailToCheck && adminEmailFromEnv && emailToCheck.toLowerCase() === adminEmailFromEnv.toLowerCase();

    // 3. Admin Auto-Unban & Escalation
    if (isAdminEmail) {
      if (!user?.isAdmin || user?.isBanned) {
        logger.info({ userId: uid }, "[AUTH] Escalating user to Admin based on email match");
        await db.update(usersTable).set({ 
          isAdmin: true, 
          isBanned: false, 
          violationCount: 0,
          planTier: "INFINITY",
          planType: "infinity",
          subscriptionStatus: "active",
          generationsRemaining: 999999
        }).where(eq(usersTable.id, uid));
        
        // Invalidate cache to force reload on next request
        syncCache.delete(uid);
        
        // If user object exists in memory, update it
        if (user) {
          user.isAdmin = true;
          user.isBanned = false;
          user.planTier = "INFINITY";
          user.planType = "infinity";
          user.subscriptionStatus = "active";
          user.generationsRemaining = 999999;
        }
      }
    }

    // 4. Ban Check
    if (user?.isBanned) {
      return res.status(403).json({ error: "ACCESS_DENIED", message: "Account suspended. Contact support." });
    }

    // 5. Fast-Path for existing users (No credits reset needed)
    if (user) {
      const now = new Date();
      const needsCreditReset = !user.lastCreditReset || (now.getTime() - new Date(user.lastCreditReset).getTime() > 24 * 60 * 60 * 1000 * 30);
      
      if (!needsCreditReset && !isAdminEmail && !user.isFirstLogin) {
        // Quick update in background
        db.update(usersTable).set({ lastLoginAt: now }).where(eq(usersTable.id, uid)).catch(() => {});
        req.userId = uid;
        req.user = user;
        syncCache.set(uid, { timestamp: now.getTime(), user });
        return next();
      }
    }

    // 6. Heavy-Path (Transaction for New User or Credit Reset)
    await db.transaction(async (tx) => {
      let finalUser = user;
      const now = new Date();

      if (!finalUser) {
        // NEW USER
        const [newUser] = await tx.insert(usersTable).values({
          id: uid,
          email: emailFromSession,
          firstName: (auth.sessionClaims?.firstName as string) || null,
          lastLoginAt: now,
          planTier: isAdminEmail ? "INFINITY" : "FREE",
          planType: isAdminEmail ? "infinity" : "free",
          generationsRemaining: isAdminEmail ? 999999 : 10,
          lastCreditReset: now,
          isAdmin: Boolean(isAdminEmail)
        }).returning();
        finalUser = newUser;
        await ensureReferralCode(uid, tx);
        if (emailFromSession) {
          WelcomeSequence.sendWelcomeToBeta(emailFromSession, (auth.sessionClaims?.firstName as string) || "").catch(() => {});
        }
      } else {
        // UPDATE EXISTING (Credit Reset or Admin Escalation)
        const updateData: any = { lastLoginAt: now, isFirstLogin: false };
        const needsCreditReset = !user.lastCreditReset || (now.getTime() - new Date(user.lastCreditReset).getTime() > 24 * 60 * 60 * 1000 * 30);

        if (isAdminEmail) {
          updateData.isAdmin = true;
          updateData.planTier = "INFINITY";
          updateData.generationsRemaining = 999999;
          updateData.subscriptionStatus = "active";
        } else if (needsCreditReset) {
          // Reset credits based on plan tier
          const tier = user.planTier || "FREE";
          const resetCredits = TIER_CREDITS[tier] || 10;
          updateData.generationsRemaining = resetCredits;
          updateData.lastCreditReset = now;
          logger.info({ userId: uid, tier, resetCredits }, "[AUTH] Resetting monthly credits");
        }

        const [updatedUser] = await tx.update(usersTable).set(updateData).where(eq(usersTable.id, uid)).returning();
        finalUser = updatedUser;
      }

      req.user = finalUser;
      syncCache.set(uid, { timestamp: now.getTime(), user: finalUser });
    });

    req.userId = uid;
    next();

  } catch (err: any) {
    logger.error({ err: err.message, userId: req.userId }, "Auth Sync Error");
    next(err);
  }
};
