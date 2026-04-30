import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { Response, NextFunction } from "express";
import { AuthenticatedRequest } from "../types";
import { getAuth } from "@clerk/express";

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
        creditsRemaining: 5,
        lastCreditReset: new Date()
      })
      .returning();
  }
  if (!user.referralCode) {
    try {
      // Dynamic import to prevent circular dependency with referral routes
      const { ensureReferralCode } = await import("../routes/referral");
      await ensureReferralCode(userId);
      const [updatedUser] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
      user = updatedUser;
    } catch (err) {
      console.error("Failed to ensure referral code in getOrCreateUser:", err);
    }
  }
  return user;
}

export function isPaidOrTrial(user: any): boolean {
  const status = user?.subscriptionStatus ?? "free";
  if (status === "active") return true;
  if ((status === "trial" || status === "active") && user?.trialEndsAt && new Date(user.trialEndsAt) > new Date()) return true;
  return false;
}

export const PLAN_RANKS: Record<string, number> = {
  FREE: 0,
  STARTER: 1,
  CREATOR: 2,
  INFINITY: 3
};

export function requireTierLevel(requiredTier: "FREE" | "STARTER" | "CREATOR" | "INFINITY") {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const user = await getOrCreateUser(req.userId);
      req.user = user;
      
      const currentTier = (user.planTier as string || "FREE").toUpperCase();
      const required = requiredTier.toUpperCase();
      
      const currentRank = PLAN_RANKS[currentTier] ?? 0;
      const requiredRank = PLAN_RANKS[required] ?? 0;
      
      if (currentRank >= requiredRank || currentTier === "INFINITY") {
        return next();
      }
      
      res.status(403).json({ 
        error: "tier_locked",
        message: `This feature requires the ${requiredTier} plan or higher. Please upgrade.`,
      });
    } catch {
      res.status(500).json({ error: "Permission validation failed." });
    }
  };
}

export const PLAN_LEVELS = {
  FREE: 0,
  STARTER: 1,
  CREATOR: 2,
  INFINITY: 3
};

export const FEATURE_CONFIG: Record<string, { name: string; requiredPlan: string; freeTrials?: number }> = {
  ideas: { name: "Idea Generator", requiredPlan: "STARTER", freeTrials: FREE_TRIALS_PER_TOOL },
  strategy: { name: "7-Day Strategy", requiredPlan: "STARTER", freeTrials: FREE_TRIALS_PER_TOOL },
  hooks: { name: "Viral Hooks", requiredPlan: "STARTER", freeTrials: FREE_TRIALS_PER_TOOL },
};

export function requirePlanOrTrial(toolKey: string) {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const user = await getOrCreateUser(req.userId);
      if (!user) {
        return res.status(401).json({ error: "User not found" });
      }

      const planTier = (user.planTier as string) || "FREE";
      
      const config = FEATURE_CONFIG[toolKey];
      if (!config) {
        return next();
      }

      const requiredLevel = PLAN_LEVELS[config.requiredPlan as keyof typeof PLAN_LEVELS] || 0;
      const userLevel = PLAN_LEVELS[planTier as keyof typeof PLAN_LEVELS] || 0;
      const isAdmin = user.securityFlags?.includes("admin") || false;

      if (isAdmin || userLevel >= requiredLevel) {
        return next();
      }

      if (user.generationsRemaining > 0) {
        req.trialMode = true;
        return next();
      }

      return res.status(402).json({
        error: "upgrade_required",
        message: `You've used all your generations. Please upgrade to ${config.requiredPlan}.`
      });

    } catch (e: any) {
      console.error("Plan check error (graceful fallback):", e.message);
      // Graceful degradation: let user pass if db is broken
      next();
    }
  };
}

export async function consumeToolTrial(userId: string, toolKey: string): Promise<number> {
  try {
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
    if (!user) return 0;

    const newGenerations = Math.max(0, user.generationsRemaining - 1);

    await db.update(usersTable)
      .set({ generationsRemaining: newGenerations })
      .where(eq(usersTable.id, userId));

    return 1;
  } catch (e: any) {
    console.error("Trial consume DB error:", e.message);
    return 1;
  }
}
