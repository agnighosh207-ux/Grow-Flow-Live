import { db, usersTable } from "@workspace/db";
import { eq, sql, and, gt } from "drizzle-orm";
import { Response, NextFunction } from "express";
import { AuthenticatedRequest } from "../types";
import { getAuth } from "@clerk/express";
import { ensureReferralCode } from "../utils/referral";
import { logger } from "../lib/logger";

export const FREE_TRIALS_PER_TOOL = 5;

export const requireAuth = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  if ((req as any).userId) {
    return next();
  }
  const auth = getAuth(req);
  const userId = auth?.sessionClaims?.userId || auth?.userId;
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  req.userId = userId as string;
  next();
};

export const requireActivePlan = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const user = (req as any).user;
  if (!user) return res.status(401).json({ error: "Unauthorized" });
  const status = user.subscriptionStatus ?? "free";
  const isAdmin = user.isAdmin === true;
  if (isAdmin || status === "active" || status === "trial") return next();
  return res.status(402).json({
    error: "upgrade_required",
    message: "Upgrade to a paid plan to use the Regenerate feature."
  });
};

export async function getOrCreateUser(userId: string, email?: string) {
  try {
    let [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
    
    if (!user) {
      logger.info({ userId, email }, "[AUTH] Creating new user record");
      [user] = await db.insert(usersTable)
        .values({ 
          id: userId, 
          email: email ?? null, 
          lastLoginAt: new Date(),
          generationsRemaining: 10,
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
      } catch (err: any) {
        logger.error({ err: err.message, userId }, "Failed to ensure referral code in getOrCreateUser");
      }
    }
    return user;
  } catch (e: any) {
    logger.error({ 
      msg: e.message, 
      code: e.code, 
      detail: e.detail, 
      userId 
    }, "[GET_OR_CREATE_USER_CRASH]");
    throw e;
  }
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
  FREE: 10,
  STARTER: 25,
  CREATOR: 150,
  INFINITY: 999999,
};


export const FEATURE_CONFIG: Record<string, { name: string; requiredPlan: string }> = {
  // ── STARTER TIER (₹149/mo) ── Core generation tools ──────────────────
  content: { name: "Content Generator", requiredPlan: "STARTER" },
  hooks: { name: "Viral Hooks Generator", requiredPlan: "STARTER" },
  caption: { name: "Caption Enhancer", requiredPlan: "STARTER" },
  bio: { name: "Bio Generator", requiredPlan: "STARTER" },
  ideas: { name: "Idea Generator", requiredPlan: "STARTER" },
  strategy: { name: "7-Day Strategy Planner", requiredPlan: "STARTER" },
  calendar: { name: "Content Calendar", requiredPlan: "STARTER" },
  vault: { name: "Swipe Vault", requiredPlan: "STARTER" },

  // ── CREATOR TIER (₹449/mo) ── Analytics + power tools ─────────────────
  trends: { name: "Trend Engine", requiredPlan: "CREATOR" },
  content_analyze: { name: "Content Performance Analyzer", requiredPlan: "CREATOR" },
  hashtags: { name: "Hashtag Intelligence", requiredPlan: "CREATOR" },
  competitor: { name: "Competitor Intelligence", requiredPlan: "CREATOR" },
  repurpose: { name: "Content Repurposer", requiredPlan: "CREATOR" },
  predictor: { name: "Performance Predictor", requiredPlan: "CREATOR" },
  "ab-test": { name: "A/B Content Tester", requiredPlan: "CREATOR" },

  // ── INFINITY TIER (₹799/mo) ── AI Identity + Agency tools ─────────────
  coach: { name: "AI Content Coach", requiredPlan: "INFINITY" },
  ghostwriter: { name: "AI Ghostwriter", requiredPlan: "INFINITY" },
  "trend-alerts": { name: "Trend Alert Digest", requiredPlan: "INFINITY" },
};

export function requirePlanOrTrial(toolKey: string) {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      // Use existing user from req if available (Identity Bridge), else fetch
      const user = (req as any).user || await getOrCreateUser(req.userId);
      if (!user) {
        return res.status(401).json({ error: "User not found" });
      }

      req.user = user; // Ensure it's attached for downstream

      const planTier = (user.planTier as string) || "FREE";
      
      const config = FEATURE_CONFIG[toolKey];
      if (!config) {
        return next();
      }

      const requiredLevel = PLAN_RANKS[config.requiredPlan as keyof typeof PLAN_RANKS] || 0;
      const userLevel = PLAN_RANKS[planTier as keyof typeof PLAN_RANKS] || 0;
      const isAdmin = user.isAdmin === true;

      if (isAdmin || (userLevel >= requiredLevel)) {
        return next();
      }

      // --- M-2 FIX: Limit Free credit bypass to STARTER level tools only ---
      if (user.generationsRemaining > 0 && requiredLevel <= PLAN_RANKS.STARTER) {
        return next();
      }

      if (user.generationsRemaining <= 0 && requiredLevel <= PLAN_RANKS.STARTER) {
        return res.status(402).json({
          error: "upgrade_required",
          message: `You've used all your generations. Please upgrade to ${config.requiredPlan}.`
        });
      }

      const upgradeMessages: Record<string, string> = {
        trends: "🔥 Trend Engine is a Creator+ feature. Upgrade to see what's trending in your niche right now.",
        hashtags: "📊 Hashtag Intelligence is a Creator+ feature. Upgrade to get strategy-grade hashtag sets.",
        predictor: "🎯 Performance Predictor is a Creator+ feature. Score your content before you post.",
        competitor: "🕵️ Competitor Intelligence is a Creator+ feature. Analyze and outperform any creator.",
        repurpose: "🔄 Content Repurposer is a Creator+ feature. Turn 1 post into 6 formats instantly.",
        "ab-test": "⚡ A/B Hook Tester is a Creator+ feature. Find your highest-converting hook every time.",
        content_analyze: "📈 Content Analyzer is a Creator+ feature. Get surgical AI feedback on your content.",
        coach: "🧠 AI Content Coach is an Infinity feature. Get a personalized weekly growth plan.",
        ghostwriter: "✍️ AI Ghostwriter is an Infinity feature. Let AI write in your exact voice at scale.",
        "trend-alerts": "🔔 Trend Alert Digest is an Infinity feature. Get real-time alerts when a trend hits your niche.",
      };

      return res.status(402).json({
        error: "upgrade_required",
        message: upgradeMessages[toolKey] || `${config.name} requires the ${config.requiredPlan} plan. Upgrade to unlock it.`,
        requiredPlan: config.requiredPlan,
        toolName: config.name,
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
