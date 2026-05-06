import rateLimit from "express-rate-limit";
import RedisStore from "rate-limit-redis";
import { extractJson } from "../services/ai-engine";
import { db, contentGenerationsTable, usersTable, securityLogsTable } from "@workspace/db";
import { redis } from "../lib/redis";
import { eq, sql } from "drizzle-orm";
import { logger } from "../lib/logger";
import { getAuth } from "@clerk/express";
import crypto from "crypto";

// Use shared Redis client
const redisClient = redis;

// Dynamic Quotas Based on Tier
const getQuotaForTier = (tier: string) => {
  switch (tier.toUpperCase()) {
    case "INFINITY": return 200; // 200 / hour (Power user / Agency)
    case "CREATOR": return 100;  // 100 / hour
    case "STARTER": return 60;   // 60 / hour (1 request per minute)
    case "FREE":
    default: return 40;        // 40 / hour (Browsing + minimal generation)
  }
};

const handleRateLimitReached = async (req: any, res: any) => {
  const userId = req.rateLimitUser?.id;
  const tier = req.rateLimitUser?.planTier || "FREE";
  const quota = getQuotaForTier(tier);
  const windowMs = 60 * 60 * 1000; // Standard 1 hour window
  
  if (!userId) {
    return res.status(429).json({ error: "api_rate_limit", message: "Rate limit exceeded." });
  }

  logger.warn({ userId }, "Rate limit reached by user");
  
  // Log Violation
  await db.insert(securityLogsTable).values({
    id: crypto.randomUUID(),
    userId: userId as string,
    eventType: "RATE_LIMIT",
    ipAddress: req.ip || req.connection?.remoteAddress || "unknown",
    userAgent: req.get("User-Agent") || "unknown",
    metadata: { tier, quota, windowMs }
  });

  // Increment violation count
  const currentViolations = req.rateLimitUser?.violationCount || 0;
  const newViolations = currentViolations + 1;
  let isBanned = req.rateLimitUser?.isBanned || false;

  const updateData: any = { violationCount: newViolations };

  // Strike 100 = BAN (Very high to avoid false positives, only catch bots)
  if (newViolations >= 100) {
    logger.error({ userId }, "USER FLAG BANNED");
    isBanned = true;
    updateData.isBanned = true;
    
    const flags = Array.isArray(req.rateLimitUser?.securityFlags) ? [...req.rateLimitUser.securityFlags] : [];
    if (!flags.includes("REPEATED_RATE_VIOLATIONS")) {
      flags.push("REPEATED_RATE_VIOLATIONS");
    }
    updateData.securityFlags = flags;

    await db.insert(securityLogsTable).values({
      id: crypto.randomUUID(),
      userId: userId as string,
      eventType: "SYSTEM_BAN",
      ipAddress: req.ip || req.connection?.remoteAddress || "unknown",
      userAgent: req.get("User-Agent") || "unknown",
      metadata: { reason: "5+ Rate Limit Violations", tier }
    });
  }

  // --- H-15 FIX: Use atomic UPDATE with returning to prevent race conditions in strike calculation ---
  const [updatedUser] = await db.update(usersTable)
    .set({
      violationCount: sql`${usersTable.violationCount} + 1`,
      isBanned: isBanned,
      securityFlags: updateData.securityFlags || undefined
    })
    .where(eq(usersTable.id, userId as string))
    .returning({ violationCount: usersTable.violationCount });

  if (updatedUser && updatedUser.violationCount >= 100 && !isBanned) {
    // Catch-all in case multiple requests hit exactly at the threshold
    await db.update(usersTable).set({ isBanned: true }).where(eq(usersTable.id, userId as string));
    isBanned = true;
  }

  if (isBanned) {
    return res.status(403).json({
      error: "ACCESS_DENIED",
      message: "Account suspended for Fair Use violations. Contact growflowai.space/support."
    });
  }

  return res.status(429).json({
    error: "api_rate_limit",
    message: "System Busy: High Demand. Please try again in a few minutes or upgrade to unlock priority lanes."
  });
};

const createLimiter = (windowMs: number, prefix: string) => {
  return rateLimit({
    windowMs,
    max: (req: any) => getQuotaForTier(req.rateLimitUser?.planTier || "FREE"),
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req: any) => req.rateLimitUser?.id || req.ip || "unknown",
    handler: handleRateLimitReached,
    store: redisClient ? new RedisStore({
      // @ts-ignore
      sendCommand: (...args: string[]) => redisClient.call(...args),
      prefix: `rl_${prefix}:`,
    }) : undefined,
    validate: { xForwardedForHeader: false },
  });
};

// Initialize globally so they aren't recreated on every request
// Standard 1 hour limiter for everyone
const guardianLimiter = createLimiter(60 * 60 * 1000, "global");

export const guardianMiddleware = async (req: any, res: any, next: any) => {
  if (!req.path.startsWith("/api/") || req.path.startsWith("/api/health") || req.path.startsWith("/api/subscription/webhook")) {
    return next();
  }

  try {
    const auth = getAuth(req);
    const userId = auth?.sessionClaims?.userId || auth?.userId;

    if (!userId) {
      return next(); 
    }

    // --- FIX: Use pre-synchronized user from req.user to avoid redundant DB hits ---
    let user = (req as any).user;
    if (!user) {
      const [fetchedUser] = await db.select().from(usersTable).where(eq(usersTable.id, userId as string));
      user = fetchedUser;
    }
    
    if (!user) {
      return res.status(401).json({ error: "Unauthorized", message: "User record not found. Please log out and log back in." });
    }
    
    if (user?.isBanned) {
      return res.status(403).json({
        error: "ACCESS_DENIED",
        message: "Account suspended for Fair Use violations. Contact growflowai.space/support."
      });
    }

    // Attach user to req so the limiter max() and handler() can use it
    req.rateLimitUser = user;

    const tier = (user?.planTier as string) || "FREE";
    const isAdmin = user?.email === process.env.ADMIN_EMAIL || user?.isAdmin;

    if (isAdmin) {
      return next();
    }

    try {
    return guardianLimiter(req, res, next);
    } catch (rlErr) {
      logger.error({ err: rlErr }, "Guardian Limiter Failure — Skipping rate limit check");
      return next();
    }

  } catch (err) {
    logger.error({ err: String(err) }, "Auth Sync Error");
    next(err);
  }
};
