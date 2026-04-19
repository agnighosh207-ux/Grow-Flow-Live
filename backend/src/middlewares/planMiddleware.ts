import { getAuth } from "@clerk/express";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";

export const FREE_TRIALS_PER_TOOL = 3000;

export const requireAuth = (req: any, res: any, next: any) => {
  const auth = getAuth(req);
  const userId = auth?.sessionClaims?.userId || auth?.userId;
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  req.userId = userId;
  next();
};

export async function getOrCreateUser(userId: string, email?: string) {
  let [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
  if (!user) {
    [user] = await db.insert(usersTable)
      .values({ id: userId, email: email ?? null, lastLoginAt: new Date() })
      .returning();
  }
  return user;
}

export function isPaidOrTrial(user: any): boolean {
  const status = user?.subscriptionStatus ?? "free";
  if (status === "active") return true;
  if (status === "trial" && user?.trialEndsAt && new Date(user.trialEndsAt) > new Date()) return true;
  return false;
}

export const PLAN_RANKS: Record<string, number> = {
  FREE: 0,
  STARTER: 1,
  CREATOR: 2,
  INFINITY: 3
};

export function requireTierLevel(requiredTier: string) {
  return async (req: any, res: any, next: any) => {
    try {
      const user = await getOrCreateUser(req.userId);
      req.user = user;
      
      const currentTier = (user.planType as string || "FREE").toUpperCase();
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

export function requirePlanOrTrial(toolKey: string) {
  return async (req: any, res: any, next: any) => {
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

      const trials = (user.toolTrials as Record<string, number> | null) || {};
      const used = trials[toolKey] || 0;
      const totalAllowed = config.freeTrials || 0;
      const remaining = Math.max(0, totalAllowed - used);

      if (remaining > 0) {
        req.trialMode = true;
        return next();
      }

      return res.status(402).json({
        error: "upgrade_required",
        message: `You've used all free trials for ${config.name}. Please upgrade to ${config.requiredPlan}.`
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

    const trials = (user.toolTrials as Record<string, number> | null) || {};
    trials[toolKey] = (trials[toolKey] || 0) + 1;

    await db.update(usersTable)
      .set({ toolTrials: trials })
      .where(eq(usersTable.id, userId));

    return trials[toolKey];
  } catch (e: any) {
    console.error("Trial consume DB error:", e.message);
    return 1;
  }
}
