import { getAuth, clerkClient } from "@clerk/express";
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
    if (!userId || typeof userId !== 'string') {
      return next(); // Skip sync for unauthenticated requests
    }

    const uid = userId as string;
    const rawEmail = auth.sessionClaims?.email;
    const emailFromSession: string | null = typeof rawEmail === 'string' ? rawEmail : null;

    // 1. Fast Cache Check
    const cached = syncCache.get(uid);
    if (cached && Date.now() - cached.timestamp < 60000 && !req.headers["x-impersonate-user"]) {
      req.userId = uid;
      req.user = cached.user;
      return next();
    }

    // 2. DB Select
    let [user] = await db.select().from(usersTable).where(eq(usersTable.id, uid));

    // 3. Admin Privilege Check
    const adminEmailFromEnv = (process.env.ADMIN_EMAIL || "agnighosh207@gmail.com").toLowerCase();
    const sessionEmail = (auth.sessionClaims?.email as string)?.toLowerCase();
    const dbEmail = user?.email?.toLowerCase();
    const clerkPrimaryEmail = emailFromSession?.toLowerCase();

    let fetchedClerkEmail: string | null = null;
    if (!dbEmail && !clerkPrimaryEmail) {
      try {
        const clerkUser = await clerkClient.users.getUser(uid);
        fetchedClerkEmail = clerkUser.emailAddresses[0]?.emailAddress?.toLowerCase() || null;
      } catch (e) {
        logger.error({ err: String(e), uid }, "Failed to fetch user email from Clerk SDK");
      }
    }

    const isAdminEmail = 
      sessionEmail === adminEmailFromEnv || 
      dbEmail === adminEmailFromEnv ||
      clerkPrimaryEmail === adminEmailFromEnv ||
      fetchedClerkEmail === adminEmailFromEnv;

    if (isAdminEmail && user) {
      // Auto-escalate EXISTING user in DB if not already set or if banned
      if (!user.isAdmin || user.planTier !== "INFINITY") {
        logger.info({ userId: uid, email: emailFromSession }, "[AUTH] Admin detected, ensuring high privileges");
        const [updatedUser] = await db.update(usersTable)
          .set({ 
            isAdmin: true, 
            isBanned: false,
            violationCount: 0,
            planTier: "INFINITY",
            planType: "infinity",
            subscriptionStatus: "active",
            generationsRemaining: 999999,
            isBetaUser: true
          })
          .where(eq(usersTable.id, uid))
          .returning();
        user = updatedUser;
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
        db.update(usersTable).set({ lastLoginAt: now }).where(eq(usersTable.id, uid)).catch(err => logger.warn({ err, userId: uid }, "lastLoginAt update failed"));
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
          email: emailFromSession || fetchedClerkEmail,
          lastLoginAt: now,
          generationsRemaining: isAdminEmail ? 999999 : 10,
          lastCreditReset: now,
          planTier: isAdminEmail ? "INFINITY" : "FREE",
          planType: isAdminEmail ? "infinity" : "free",
          subscriptionStatus: isAdminEmail ? "active" : "free",
          isBetaUser: isAdminEmail,
          isAdmin: isAdminEmail,
        }).returning();
        finalUser = newUser;
        
        // Background tasks
        WelcomeSequence.sendWelcomeToBeta(emailFromSession || "", (auth.sessionClaims?.firstName as string) || "").catch(() => {});
        await ensureReferralCode(uid, tx);
      } else {
        // EXISTING USER - Possible credit reset or info update
        const updates: any = { lastLoginAt: now };
        
        const resetThreshold = 24 * 60 * 60 * 1000 * 30;
        const needsCreditReset = !finalUser.lastCreditReset || (now.getTime() - new Date(finalUser.lastCreditReset).getTime() > resetThreshold);
        
        if (needsCreditReset) {
          const tier = (finalUser.planTier || "FREE") as string;
          // Ensure new or zero-credit users get their starting 10 credits
          if (user.generationsRemaining === 0 && !user.lastCreditReset) {
            updates.generationsRemaining = 10;
          } else {
            updates.generationsRemaining = TIER_CREDITS[tier] || 10;
          }
          updates.lastCreditReset = now;
        }

        if (emailFromSession && !finalUser.email) {
          updates.email = emailFromSession;
        }

        if (isAdminEmail && !finalUser.isAdmin) {
            updates.isAdmin = true;
            updates.planTier = "INFINITY";
            updates.planType = "infinity";
            updates.subscriptionStatus = "active";
            updates.generationsRemaining = 999999;
        }

        const [updatedUser] = await tx.update(usersTable).set(updates).where(eq(usersTable.id, uid)).returning();
        finalUser = updatedUser;
      }

      user = finalUser;
    });

    // 7. Impersonation Check (Admins only)
    const targetUserId = req.headers["x-impersonate-user"] as string;
    if (isAdminEmail && targetUserId) {
      const [impersonatedUser] = await db.select().from(usersTable).where(eq(usersTable.id, targetUserId));
      if (impersonatedUser) {
        // Verify session exists and is active
        const [activeSession] = await db.select()
          .from(impersonationSessionsTable)
          .where(and(
            eq(impersonationSessionsTable.adminId, uid),
            eq(impersonationSessionsTable.targetUserId, targetUserId),
            isNull(impersonationSessionsTable.endedAt),
            gt(impersonationSessionsTable.expiresAt, new Date())
          ))
          .limit(1);

        if (activeSession) {
          logger.info({ adminId: uid, targetUserId }, "[AUTH] Admin impersonating user");
          req.userId = targetUserId;
          req.user = impersonatedUser;
          req.isAdminImpersonating = true;
          // DO NOT cache impersonated sessions in syncCache to avoid cross-pollination
          return next();
        } else {
          logger.warn({ adminId: uid, targetUserId }, "[AUTH] Impersonation attempt failed: No active session");
        }
      }
    }

    req.userId = uid;
    req.user = user;
    syncCache.set(uid, { timestamp: Date.now(), user });
    next();
  } catch (err: any) {
    logger.error({ err: err.message, stack: err.stack, userId: req.userId }, "[AUTH_SYNC_CRITICAL]");
    res.status(500).json({ 
      error: "AUTH_SYNC_FAILED", 
      message: "Identity synchronization failed. Please try again in a moment." 
    });
  }
};
