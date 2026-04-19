import rateLimit from "express-rate-limit";
import { getAuth } from "@clerk/express";
import { db, usersTable } from "@workspace/db";
import { securityLogsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import pino from "pino";
import crypto from "crypto";

const logger = pino();

// Dynamic Quotas Based on Tier
const getQuotaForTier = (tier: string) => {
  switch (tier.toUpperCase()) {
    case "INFINITY": return 60; // 60 / hour (The Human Speed limit)
    case "CREATOR": return 30; // 30 / hour
    case "STARTER": return 10; // 10 / hour
    case "FREE":
    default: return 5; // 5 / 24 hours (Free total is enforced via creditsRemaining basically)
  }
};

const getWindowForTier = (tier: string) => {
  if (tier.toUpperCase() === "FREE") {
    return 24 * 60 * 60 * 1000; // 24 hours
  }
  return 60 * 60 * 1000; // 1 hour for all others
};

/**
 * Custom memory store to dynamically apply rate limits per-user
 * based on their specific plan limits while matching the express-rate-limit interface.
 */
export const guardianMiddleware = async (req: any, res: any, next: any) => {
  try {
    const auth = getAuth(req);
    const userId = auth?.sessionClaims?.userId || auth?.userId;

    if (!userId) {
      return next(); // Pass to requireAuth to handle 401
    }

    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId as string));
    
    // Kill Switch integration check (Belt & Suspenders)
    if (user?.isBanned) {
      return res.status(403).json({
        error: "ACCESS_DENIED",
        message: "Account suspended for Fair Use violations. Contact growflowai.space/support."
      });
    }

    const tier = (user?.planType as string) || "FREE";
    const quota = getQuotaForTier(tier);
    const windowMs = getWindowForTier(tier);

    // Apply the standard express-rate-limit dynamically using functional generation
    const limiter = rateLimit({
      windowMs,
      max: quota,
      standardHeaders: true,
      legacyHeaders: false,
      keyGenerator: (req) => `${userId}`,
      handler: async (req, res) => {
        logger.warn(`[SECURITY] Rate limit reached by user: ${userId}`);
        
        // Log Violation
        await db.insert(securityLogsTable).values({
          id: crypto.randomUUID(),
          userId: userId as string,
          eventType: "RATE_LIMIT",
          ipAddress: req.ip || req.connection.remoteAddress,
          userAgent: req.get("User-Agent") || "unknown",
          metadata: { tier, quota, windowMs }
        });

        // Increment violation count
        const currentViolations = user?.violationCount || 0;
        const newViolations = currentViolations + 1;
        let isBanned = user?.isBanned || false;

        const updateData: any = { violationCount: newViolations };

        // Strike 5 = BAN
        if (newViolations >= 5) {
          logger.error(`[SECURITY] USER FLAG BANNED: ${userId}`);
          isBanned = true;
          updateData.isBanned = true;
          
          const flags = Array.isArray(user?.securityFlags) ? [...user.securityFlags] : [];
          if (!flags.includes("REPEATED_RATE_VIOLATIONS")) {
            flags.push("REPEATED_RATE_VIOLATIONS");
          }
          updateData.securityFlags = flags;

          await db.insert(securityLogsTable).values({
            id: crypto.randomUUID(),
            userId: userId as string,
            eventType: "SYSTEM_BAN",
            ipAddress: req.ip || req.connection.remoteAddress,
            userAgent: req.get("User-Agent") || "unknown",
            metadata: { reason: "5+ Rate Limit Violations", tier }
          });
        }

        await db.update(usersTable)
          .set(updateData)
          .where(eq(usersTable.id, userId as string));

        if (isBanned) {
          return res.status(403).json({
            error: "ACCESS_DENIED",
            message: "Account suspended for Fair Use violations. Contact growflowai.space/support."
          });
        }

        return res.status(429).json({
          error: "api_rate_limit",
          message: `Tier capacity reached. ${quota} requests allowed per ${windowMs === 3600000 ? 'hour' : '24 hours'}. Please slow down or upgrade.`,
        });
      }
    });

    return limiter(req, res, next);
  } catch (error: any) {
    logger.error({ err: error }, "[Guardian] Middleware crash");
    next();
  }
};
