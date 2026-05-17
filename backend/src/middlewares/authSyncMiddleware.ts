import { getAuth, clerkClient } from "@clerk/express";
import { db, usersTable, impersonationSessionsTable, agencySessionsTable } from "@workspace/db";
import { eq, and, gt, isNull, gte } from "drizzle-orm";
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

    const uid = userId;
    const rawEmail = (auth.sessionClaims as any)?.email 
      || (auth.sessionClaims as any)?.emailAddresses?.[0]
      || (auth.sessionClaims as any)?.primaryEmailAddress;
    const emailFromSession: string | null = typeof rawEmail === 'string' ? rawEmail : null;

    const deviceFingerprint = req.headers['x-device-id'] as string || 
      req.headers['x-forwarded-for'] as string || 
      req.ip || 
      'unknown';

    // 1. Fast Cache Check
    const cached = syncCache.get(uid);
    if (cached && Date.now() - cached.timestamp < 60000 && !req.headers["x-impersonate-user"]) {
      const planType = cached.user?.planType || "free";
      const cachedDeviceId = cached.user?.deviceId;
      // Skip cache check if the device fingerprint changed for a single-session user
      if (planType !== "agency" && cachedDeviceId && cachedDeviceId !== deviceFingerprint) {
        // Skip cache check and hit DB
      } else {
        req.userId = uid;
        req.user = cached.user;
        return next();
      }
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

    if (user) {
      // Determine max allowed sessions by plan
      const MAX_SESSIONS: Record<string, number> = {
        free: 1,
        starter: 1,
        creator: 1,
        infinity: 1,
        agency: 5,  // Agency plan gets 5 devices
      };

      const planType = user.planType || "free";
      const maxSessions = MAX_SESSIONS[planType] || 1;

      if (maxSessions === 1) {
        // Single device enforcement
        const currentDeviceId = user.deviceId;
        const clientDeviceId = req.headers['x-device-id'] as string;
        
        if (clientDeviceId) {
          if (currentDeviceId && currentDeviceId !== clientDeviceId) {
            // Check if the old device has been active recently (within the last 15 seconds).
            // If the old device was active in the last 15 seconds, we treat it as an active simultaneous conflict.
            // Otherwise, we allow the new device to seamlessly take over!
            const lastActive = user.lastLoginAt ? new Date(user.lastLoginAt).getTime() : 0;
            const isSimultaneousActive = (Date.now() - lastActive) < 15000;
            
            if (isSimultaneousActive) {
              res.status(401).json({ 
                error: "session_conflict",
                message: "Your account was signed in on another device. You have been logged out.",
                code: "DEVICE_CONFLICT"
              });
              return;
            }
          }
          
          // Update deviceId if new login / takeover
          if (!currentDeviceId || currentDeviceId !== clientDeviceId) {
            await db.update(usersTable)
              .set({ deviceId: clientDeviceId, lastLoginAt: new Date() })
              .where(eq(usersTable.id, user.id));
            user.deviceId = clientDeviceId;
            invalidateAuthCache(user.id);
          }
        }
      } else if (maxSessions === 5) {
        // Count active agency sessions (active in last 30 days)
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        const activeSessions = await db.select()
          .from(agencySessionsTable)
          .where(
            and(
              eq(agencySessionsTable.userId, user.id),
              gte(agencySessionsTable.lastActiveAt, thirtyDaysAgo)
            )
          );

        const existingSession = activeSessions.find(s => s.deviceId === deviceFingerprint);

        if (existingSession) {
          // Update existing session lastActive
          await db.update(agencySessionsTable)
            .set({ lastActiveAt: new Date() })
            .where(eq(agencySessionsTable.id, existingSession.id));
        } else {
          // New device
          if (activeSessions.length >= maxSessions) {
            res.status(401).json({
              error: "session_limit",
              message: `Your Agency plan allows ${maxSessions} active devices. Please remove a device from Settings → Team to add this one.`,
              code: "SESSION_LIMIT_REACHED",
              activeSessions: activeSessions.length,
              maxSessions,
            });
            return;
          }
          // Add new session
          await db.insert(agencySessionsTable).values({
            userId: user.id,
            deviceId: deviceFingerprint,
            deviceName: req.headers['user-agent']?.substring(0, 100) || "Unknown Device",
          });
        }
      }
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

      if (finalUser) {
        // EXISTING USER - Possible credit reset or info update
        const updates: any = { lastLoginAt: now };
        
        const normalizedPlanType = finalUser.planType || "free";
        const normalizedPlanTier = normalizedPlanType.toUpperCase();
        if (finalUser.planTier !== normalizedPlanTier) {
          updates.planTier = normalizedPlanTier;
          logger.warn({ userId: uid, planType: normalizedPlanType, wrongTier: finalUser.planTier }, 
            "[AUTH_SYNC] planTier/planType mismatch fixed");
        }
        
        const resetThreshold = 24 * 60 * 60 * 1000 * 30;
        const needsCreditReset = !finalUser.lastCreditReset || (now.getTime() - new Date(finalUser.lastCreditReset).getTime() > resetThreshold);
        
        if (needsCreditReset) {
          const tier = (updates.planTier || finalUser.planTier || "FREE") as string;
          // Ensure new or zero-credit users get their starting 5 credits
          if (finalUser.generationsRemaining === 0 && !finalUser.lastCreditReset) {
            updates.generationsRemaining = 5;
          } else {
            updates.generationsRemaining = TIER_CREDITS[tier] || 5;
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
      } else {
        // NEW USER
        const [newUser] = await tx.insert(usersTable).values({
          id: uid,
          email: emailFromSession || fetchedClerkEmail,
          lastLoginAt: now,
          generationsRemaining: isAdminEmail ? 999999 : 5,
          lastCreditReset: now,
          planTier: isAdminEmail ? "INFINITY" : "FREE",
          planType: isAdminEmail ? "infinity" : "free",
          subscriptionStatus: isAdminEmail ? "active" : "free",
          isBetaUser: isAdminEmail,
          isAdmin: isAdminEmail,
          deviceId: deviceFingerprint,
        }).returning();
        finalUser = newUser;
        
        // Background tasks
        WelcomeSequence.sendWelcomeToBeta(emailFromSession || "", (auth.sessionClaims?.firstName as string) || "").catch(() => {});
        await ensureReferralCode(uid, tx);
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
