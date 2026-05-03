import rateLimit from "express-rate-limit";
import RedisStore from "rate-limit-redis";
import { extractJson } from "../services/ai-engine";
import { db, contentGenerationsTable, usersTable, securityLogsTable } from "@workspace/db";
import { redis } from "../lib/redis";
import { eq } from "drizzle-orm";
import { logger } from "../lib/logger";
import { getAuth } from "@clerk/express";
import crypto from "crypto";

// Use shared Redis client
const redisClient = redis;

// Dynamic Quotas Based on Tier
const getQuotaForTier = (tier: string) => {
  switch (tier.toUpperCase()) {
    case "INFINITY": return 60; // 60 / hour (The Human Speed limit)
    case "CREATOR": return 30; // 30 / hour
    case "STARTER": return 10; // 10 / hour
    case "FREE":
    default: return 5; // 5 / 24 hours
  }
};

const handleRateLimitReached = async (req: any, res: any) => {
  const userId = req.rateLimitUser?.id;
  const tier = req.rateLimitUser?.planType || "FREE";
  const quota = getQuotaForTier(tier);
  const windowMs = tier.toUpperCase() === "FREE" ? 24 * 60 * 60 * 1000 : 60 * 60 * 1000;
  
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

  // Strike 5 = BAN
  if (newViolations >= 5) {
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
};

const createLimiter = (windowMs: number, prefix: string) => {
  return rateLimit({
    windowMs,
    max: (req: any) => getQuotaForTier(req.rateLimitUser?.planType || "FREE"),
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req: any) => req.rateLimitUser?.id || req.ip || "unknown",
    validate: false, // Suppress all validation warnings for production stability
    handler: handleRateLimitReached,
    store: redisClient ? new RedisStore({
      // @ts-ignore
      sendCommand: (...args: string[]) => redisClient.call(...args),
      prefix: `rl_${prefix}:`,
    }) : undefined,
  });
};

// Initialize globally so they aren't recreated on every request
const freeLimiter = createLimiter(24 * 60 * 60 * 1000, "free");
const paidLimiter = createLimiter(60 * 60 * 1000, "paid");

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

    const tier = (user?.planType as string) || "FREE";
    const isAdmin = user?.email === process.env.ADMIN_EMAIL || user?.isAdmin;

    if (isAdmin) {
      return next();
    }

    if (tier.toUpperCase() === "FREE") {
      return freeLimiter(req, res, next);
    } else {
      return paidLimiter(req, res, next);
    }

  } catch (err) {
    logger.error({ err: String(err) }, "Auth Sync Error");
    next(err);
  }
};
