import { db, usersTable } from "@workspace/db";
import { eq, sql, and, gt } from "drizzle-orm";
import { Response, NextFunction } from "express";
import { AuthenticatedRequest } from "../types";
import { getAuth } from "@clerk/express";
import { ensureReferralCode } from "../utils/referral";

export const FREE_TRIALS_PER_TOOL = 3;

export const requireAuth = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const auth = getAuth(req);
  const userId = auth?.sessionClaims?.userId || auth?.userId;
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  req.userId = userId as string;
  next();
};

export async function getOrCreateUser(userId: string, email?: string) {
  let [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
  if (!user) {
    [user] = await db.insert(usersTable)
      .values({ 
        id: userId, 
        email: email ?? null, 
        lastLoginAt: new Date(),
        generationsRemaining: 5,
        lastCreditReset: new Date(),
        planTier: "FREE",
        planType: "free",
        isBetaUser: false,
        isAdmin: email ? email === process.env.ADMIN_EMAIL : false,
      })
      .returning();
  }
  if (!user.referralCode) {
    try {
      const code = await ensureReferralCode(userId);
      user.referralCode = code;
    } catch (err) {
      console.error("Failed to ensure referral code in getOrCreateUser:", err);
    }
  }
  return user;
}

export function isPaidOrTrial(user: any): boolean {
  const status = user?.subscriptionStatus ?? "free";
  if (status === "active") return true;
  if (user?.trialEndsAt && new Date(user.trialEndsAt) > new Date()) return true;
  return false;
}

// Source of truth for plan hierarchy
export const PLAN_RANKS: Record<string, number> = {
  FREE: 0,
  STARTER: 1,
  CREATOR: 2,
  INFINITY: 3
};

export const TIER_CREDITS: Record<string, number> = {
  FREE: 5,
  STARTER: 20,
  CREATOR: 100,
  INFINITY: 9999
};


export const FEATURE_CONFIG: Record<string, { name: string; requiredPlan: string }> = {
  ideas: { name: "Idea Generator", requiredPlan: "STARTER" },
  strategy: { name: "7-Day Strategy", requiredPlan: "STARTER" },
  hooks: { name: "Viral Hooks", requiredPlan: "STARTER" },
  trends: { name: "Trend Engine", requiredPlan: "STARTER" },
  content_analyze: { name: "Content Analysis", requiredPlan: "STARTER" },
  bio: { name: "Bio Generator", requiredPlan: "STARTER" },
  content: { name: "Content Generator", requiredPlan: "STARTER" },
  caption: { name: "Caption Enhancer", requiredPlan: "STARTER" },
};

export function requirePlanOrTrial(toolKey: string) {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const user = await getOrCreateUser(req.userId);
      if (!user) {
        return res.status(401).json({ error: "User not found" });
      }

      req.user = user; // Attach user to request for downstream handlers

      const planTier = (user.planTier as string) || "FREE";
      
      const config = FEATURE_CONFIG[toolKey];
      if (!config) {
        return next();
      }

      const requiredLevel = PLAN_RANKS[config.requiredPlan as keyof typeof PLAN_RANKS] || 0;
      const userLevel = PLAN_RANKS[planTier as keyof typeof PLAN_RANKS] || 0;
      const isAdmin = user.isAdmin === true;

      if (isAdmin || userLevel >= requiredLevel) {
        return next();
      }

      if (user.generationsRemaining > 0) {
        return next();
      }

      return res.status(402).json({
        error: "upgrade_required",
        message: `You've used all your generations. Please upgrade to ${config.requiredPlan}.`
      });

    } catch (e: any) {
      console.error("Plan check error (STRICT REJECT):", e.message);
      res.status(503).json({ error: "Billing system temporarily unavailable. Please try again." });
    }
  };
}

export async function consumeToolTrial(userId: string, toolKey: string): Promise<number> {
  try {
    const result = await db.update(usersTable)
      .set({ 
        generationsRemaining: sql`GREATEST(0, ${usersTable.generationsRemaining} - 1)`,
        totalGenerations: sql`${usersTable.totalGenerations} + 1`
      })
      .where(and(
        eq(usersTable.id, userId),
        gt(usersTable.generationsRemaining, 0)
      ))
      .returning({ id: usersTable.id });

    if (result.length === 0) {
      throw new Error("NO_CREDITS_REMAINING");
    }
    return 1;
  } catch (e: any) {
    console.error("Trial consume DB error:", e.message);
    throw e;
  }
}
