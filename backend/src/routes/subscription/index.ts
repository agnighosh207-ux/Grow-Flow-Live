import { Router, type IRouter } from "express";
import { logger } from "../../lib/logger";
import { eq, count, gte, and, sql } from "drizzle-orm";
import { db, usersTable, contentGenerationsTable, couponsTable, securityLogsTable, paymentsTable } from "@workspace/db";
import crypto from "crypto";
import { FREE_TRIALS_PER_TOOL, isPaidOrTrial, consumeToolTrial, requireAuth, getOrCreateUser, TIER_CREDITS } from "../../middlewares/planMiddleware";
import { WelcomeSequence } from "../../lib/WelcomeSequence";
import { AuthenticatedRequest } from "../../types";
import { Response } from "express";
import { ensureReferralCode, grantReferralReward } from "../../utils/referral";
import { sendWelcomeEmail, sendPaymentFailedEmail } from "../../services/email";
import { sendSequenceEmail } from "../../services/emailSequences";
import { sendWhatsAppMessage } from "../../services/whatsapp";
import Razorpay from "razorpay";
import { invalidateAuthCache } from "../../middlewares/authSyncMiddleware";
import rateLimit, { ipKeyGenerator } from "express-rate-limit";
import { getRazorpayPlanId } from "../../utils/planRouter";
import { createSubscription } from "../../services/payment-service";


const router: IRouter = Router();

function getRazorpay() {
  const appStatus = process.env.APP_STATUS || "";
  const isProd = 
    process.env.NODE_ENV === "production" || 
    appStatus === "PRODUCTION" || 
    appStatus === "BETA" ||
    !!process.env.RAILWAY_ENVIRONMENT;

  const keyId = isProd 
    ? process.env.RAZORPAY_LIVE_KEY_ID 
    : (process.env.RAZORPAY_TEST_KEY_ID?.includes("...") || !process.env.RAZORPAY_TEST_KEY_ID 
        ? process.env.RAZORPAY_LIVE_KEY_ID 
        : process.env.RAZORPAY_TEST_KEY_ID);

  const keySecret = isProd 
    ? process.env.RAZORPAY_LIVE_KEY_SECRET 
    : (process.env.RAZORPAY_TEST_KEY_SECRET?.includes("...") || !process.env.RAZORPAY_TEST_KEY_SECRET 
        ? process.env.RAZORPAY_LIVE_KEY_SECRET 
        : process.env.RAZORPAY_TEST_KEY_SECRET);

  logger.info({ isProd, hasKeyId: !!keyId, hasSecret: !!keySecret, appStatus }, "[Razorpay] Key selection");

  if (!keyId || !keySecret) {
    logger.error("[Razorpay] CRITICAL: No valid keys found");
    return { rzp: null, keyId: null };
  }

  return { rzp: new Razorpay({ key_id: keyId, key_secret: keySecret }), keyId };
}

// requireAuth and getOrCreateUser are now centralized in planMiddleware.ts (Flaw 20 & 21 fix)

function getTierFromPlanId(planId: string): "starter" | "creator" | "infinity" | null {
  const tiers = ["STARTER", "CREATOR", "INFINITY"] as const;
  const cycles = ["MONTHLY", "QUARTERLY", "HALFYEARLY", "YEARLY"] as const;
  const currencies = ["", "_USD"] as const;

  for (const tier of tiers) {
    for (const cycle of cycles) {
      for (const curr of currencies) {
        const key = `RAZORPAY_PLAN_${tier}_${cycle}${curr}`;
        if (process.env[key] === planId) {
          return tier.toLowerCase() as any;
        }
      }
    }
  }
  return null;
}

function computePlan(user: any, totalGenerations: number, monthlyGenerations: number) {
  const now = new Date();
  const planType = (user.planType || "free") as "free" | "starter" | "creator" | "infinity";
  const generationsRemaining = typeof user.generationsRemaining === 'number' ? user.generationsRemaining : parseInt(user.generationsRemaining || '0');
  const dbGenerationsField = typeof user.totalGenerations === 'number' ? user.totalGenerations : parseInt(user.totalGenerations || '0');
  
  // Use logger for production-safe debugging
  logger.info({ 
    userId: user.id, 
    remaining: generationsRemaining, 
    status: user.subscriptionStatus, 
    plan: planType,
    isBeta: !!user.isBetaUser,
    dbField: dbGenerationsField,
    argCount: totalGenerations
  }, "[SUBSCRIPTION_STATUS] Computing plan state");

  if (user.isAdmin) {
    return {
      plan: "active" as const, planType: "infinity",
      canGenerate: true,
      trialDaysLeft: null, generationLimit: 999,
      monthlyGenerationsUsed: monthlyGenerations,
      generationsRemaining: 9999,
      totalGenerationsUsed: totalGenerations,
    };
  }

  if (
    user.subscriptionStatus === "active" || 
    (user.subscriptionStatus === "canceled" && user.planExpiry && new Date(user.planExpiry) > now)
  ) {
    // Active subscription or canceled but within grace period — treat as active
    if (planType === "starter") {
      return {
        plan: "active" as const, planType,
        canGenerate: generationsRemaining > 0,
        trialDaysLeft: null, generationLimit: 25,
        monthlyGenerationsUsed: Math.max(0, 25 - generationsRemaining),
        generationsRemaining: generationsRemaining,
        totalGenerationsUsed: totalGenerations,
      };
    }
    if (planType === "creator") {
      return {
        plan: "active" as const, planType,
        canGenerate: generationsRemaining > 0,
        trialDaysLeft: null, generationLimit: 150,
        monthlyGenerationsUsed: Math.max(0, 150 - generationsRemaining),
        generationsRemaining: generationsRemaining,
        totalGenerationsUsed: totalGenerations,
      };
    }
    if (planType === "infinity") {
      let daysLeft = null;
      if (user.planExpiry && new Date(user.planExpiry) > now) {
        daysLeft = Math.ceil((new Date(user.planExpiry).getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      }
      return {
        plan: "active" as const, planType,
        canGenerate: true, // Unlimited
        trialDaysLeft: daysLeft, generationLimit: 500, // Soft display limit — actual DB limit is 9999
        monthlyGenerationsUsed: monthlyGenerations,
        generationsRemaining: 9999,
        totalGenerationsUsed: totalGenerations,
      };
    }
  }

  // Handle trial period
  if (user.subscriptionStatus === "trial") {
    const isTrialActive = user.trialEndsAt && new Date(user.trialEndsAt) > now;
    
    if (isTrialActive) {
      const msLeft = new Date(user.trialEndsAt).getTime() - now.getTime();
      const daysLeft = Math.ceil(msLeft / (1000 * 60 * 60 * 24));
      const tierLimits: Record<string, number> = { starter: 25, creator: 150, infinity: 9999 };
      const limit = tierLimits[planType] || 5;

      return {
        plan: "trial" as const, planType,
        canGenerate: planType === "infinity" ? true : generationsRemaining > 0,
        trialDaysLeft: daysLeft, generationLimit: limit,
        monthlyGenerationsUsed: Math.max(0, limit - generationsRemaining),
        generationsRemaining: generationsRemaining,
        totalGenerationsUsed: totalGenerations,
      };
    } else if (user.razorpaySubscriptionId) {
      // --- FIX: Trial Ends But User Still Shows as Trial in UI ---
      // If trial ended but status is still 'trial', they are now active paid users.
      const tierLimits: Record<string, number> = { starter: 25, creator: 150, infinity: 9999 };
      const limit = tierLimits[planType] || 5;
      return {
        plan: "active" as const, planType,
        canGenerate: planType === "infinity" ? true : generationsRemaining > 0,
        trialDaysLeft: 0, generationLimit: limit,
        monthlyGenerationsUsed: Math.max(0, limit - generationsRemaining),
        generationsRemaining: generationsRemaining,
        totalGenerationsUsed: totalGenerations,
      };
    }
  }

  // Handle pending status — user initiated payment but hasn't completed it yet
  // Preserve their planType so they don't appear downgraded
  if (user.subscriptionStatus === "pending" && planType !== "free") {
    const tierLimits: Record<string, number> = { starter: 25, creator: 150, infinity: 9999 };
    const limit = tierLimits[planType] || 5;
    return {
      plan: "pending" as const, planType,
      canGenerate: generationsRemaining > 0,
      trialDaysLeft: null, generationLimit: limit,
      monthlyGenerationsUsed: limit - generationsRemaining,
      generationsRemaining: generationsRemaining,
      totalGenerationsUsed: totalGenerations,
    };
  }

  // Handle past_due — subscription payment failed but user is still a paying user
  if (user.subscriptionStatus === "past_due" && planType !== "free") {
    const tierLimits: Record<string, number> = { starter: 25, creator: 150, infinity: 9999 };
    const limit = tierLimits[planType] || 5;
    return {
      plan: "past_due" as const, planType,
      canGenerate: generationsRemaining > 0,
      trialDaysLeft: null, generationLimit: limit,
      monthlyGenerationsUsed: limit - generationsRemaining,
      generationsRemaining: generationsRemaining,
      totalGenerationsUsed: totalGenerations,
    };
  }

  // Fallback to free (genuinely free users, or fully canceled/blocked users)
  const freeLimit = TIER_CREDITS.FREE;
  return {
    plan: "free" as const, planType: "free" as const,
    canGenerate: generationsRemaining > 0,
    trialDaysLeft: null, 
    generationLimit: freeLimit,
    monthlyGenerationsUsed: Math.max(0, freeLimit - generationsRemaining),
    generationsRemaining: generationsRemaining,
    totalGenerationsUsed: totalGenerations,
    currentStreak: user.currentStreak || 0,
    totalGenerations: user.totalGenerations || 0,
  };
}

function getMonthlyWindowStart(user: any): Date {
  const now = new Date();
  // --- FIX: Monthly Window for Paid Users ---
  // For active paid users, the window starts at the last credit reset (webhook sync).
  // This ensures the UI monthly count aligns with the Razorpay billing cycle.
  if (user.subscriptionStatus === "active" && user.lastCreditReset) {
    return new Date(user.lastCreditReset);
  }

  const baseDate = user.trialStartDate || user.createdAt || now;
  const subStart = new Date(baseDate);
  const msIn30Days = 30 * 24 * 60 * 60 * 1000;
  const msSinceStart = now.getTime() - subStart.getTime();
  const cycleNumber = Math.floor(msSinceStart / msIn30Days);
  return new Date(subStart.getTime() + cycleNumber * msIn30Days);
}

router.get("/status", requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const user = (req as any).user;
  if (!user) {
    res.status(401).json({ error: "User not found" });
    return;
  }

  const [genCount] = await db
    .select({ count: count() })
    .from(contentGenerationsTable)
    .where(eq(contentGenerationsTable.userId, req.userId));

  const now = new Date();
  const monthStart = getMonthlyWindowStart(user);
  const [monthlyCount] = await db
    .select({ count: count() })
    .from(contentGenerationsTable)
    .where(
      and(
        eq(contentGenerationsTable.userId, req.userId),
        gte(contentGenerationsTable.createdAt, monthStart)
      )
    );

  const totalGenerations = Number(genCount?.count ?? 0);
  const monthlyGenerations = Number(monthlyCount?.count ?? 0);
  const result = computePlan(user, totalGenerations, monthlyGenerations);

  res.json({
    ...result,
    generationsUsed: monthlyGenerations,
    generationsRemaining: user.generationsRemaining,
    trialEndsAt: user.trialEndsAt?.toISOString() ?? null,
    planExpiry: user.planExpiry?.toISOString() ?? null,
    subscriptionStatus: user.subscriptionStatus,
    razorpaySubscriptionId: user.razorpaySubscriptionId,
    isAdmin: user.isAdmin,
    currentStreak: user.currentStreak || 0,
    totalGenerations: user.totalGenerations || 0,
  });
});

const PLAN_CONFIG = {
  starter: {
    displayName: "Starter",
    monthly: { amount: 14900, period: "monthly" as const, interval: 1, totalCount: 120 },
    quarterly: { amount: 41700, period: "monthly" as const, interval: 3, totalCount: 40 },
    "half-yearly": { amount: 79800, period: "monthly" as const, interval: 6, totalCount: 20 },
    yearly: { amount: 143000, period: "yearly" as const, interval: 1, totalCount: 10 },
  },
  creator: {
    displayName: "Creator",
    monthly: { amount: 44900, period: "monthly" as const, interval: 1, totalCount: 120 },
    quarterly: { amount: 125700, period: "monthly" as const, interval: 3, totalCount: 40 },
    "half-yearly": { amount: 242800, period: "monthly" as const, interval: 6, totalCount: 20 },
    yearly: { amount: 430000, period: "yearly" as const, interval: 1, totalCount: 10 },
  },
  infinity: {
    displayName: "Infinity",
    monthly: { amount: 79900, period: "monthly" as const, interval: 1, totalCount: 120 },
    quarterly: { amount: 224700, period: "monthly" as const, interval: 3, totalCount: 40 },
    "half-yearly": { amount: 432000, period: "monthly" as const, interval: 6, totalCount: 20 },
    yearly: { amount: 766000, period: "yearly" as const, interval: 1, totalCount: 10 },
  },
  USD: {
    starter: {
      monthly: { amount: 500, period: "monthly" as const, interval: 1, totalCount: 120 },
      quarterly: { amount: 1350, period: "monthly" as const, interval: 3, totalCount: 40 },
      "half-yearly": { amount: 2550, period: "monthly" as const, interval: 6, totalCount: 20 },
      yearly: { amount: 4800, period: "yearly" as const, interval: 1, totalCount: 10 },
    },
    creator: {
      monthly: { amount: 1500, period: "monthly" as const, interval: 1, totalCount: 120 },
      quarterly: { amount: 4050, period: "monthly" as const, interval: 3, totalCount: 40 },
      "half-yearly": { amount: 7800, period: "monthly" as const, interval: 6, totalCount: 20 },
      yearly: { amount: 14400, period: "yearly" as const, interval: 1, totalCount: 10 },
    },
    infinity: {
      monthly: { amount: 2700, period: "monthly" as const, interval: 1, totalCount: 120 },
      quarterly: { amount: 7290, period: "monthly" as const, interval: 3, totalCount: 40 },
      "half-yearly": { amount: 14040, period: "monthly" as const, interval: 6, totalCount: 20 },
      yearly: { amount: 25920, period: "yearly" as const, interval: 1, totalCount: 10 },
    },
  },
};

const subscriptionCreateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 5,
  keyGenerator: (req: any, res: any) => req.userId || ipKeyGenerator(req, res),
  message: { error: "Too many payment attempts. Please wait before trying again." },
  standardHeaders: true,
  legacyHeaders: false,
  validate: false,
});

router.post("/create", requireAuth, subscriptionCreateLimiter, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const user = (req as any).user;
    const { planType, couponCode, billingPeriod, currency = "INR" } = req.body as {
      planType?: "starter" | "creator" | "infinity";
      couponCode?: string;
      billingPeriod?: "monthly" | "quarterly" | "half-yearly" | "yearly";
      currency?: "INR" | "USD";
    };

    logger.info({ userId: req.userId, planType, billingPeriod, currency }, "[SUBSCRIPTION] Create request received");
    
    if (!user) {
      logger.error({ userId: req.userId }, "[SUBSCRIPTION] User object missing from request");
      res.status(500).json({ error: "user_context_missing", message: "User data could not be synchronized. Please try logging out and back in." });
      return;
    }

    if (!planType) {
      res.status(400).json({ error: "planType is required" });
      return;
    }

    const effectivePlan = (planType === "infinity" ? "infinity" : planType === "creator" ? "creator" : "starter") as "starter" | "creator" | "infinity";
    const billing = (billingPeriod === "yearly" ? "yearly" : billingPeriod === "half-yearly" ? "half-yearly" : billingPeriod === "quarterly" ? "quarterly" : "monthly");
    
    let razorpayPlanId: string;
    try {
      razorpayPlanId = getRazorpayPlanId(effectivePlan, billing, currency);
      logger.info({ userId: req.userId, planId: razorpayPlanId }, "[SUBSCRIPTION] Resolved Plan ID");
    } catch (err: any) {
      logger.error({ userId: req.userId, err: err.message, effectivePlan, billing }, "[SUBSCRIPTION] Plan Resolution Failed");
      res.status(400).json({ error: err.message });
      return;
    }

    const config = currency === "USD" 
      ? ((PLAN_CONFIG as any).USD[effectivePlan][billing] || (PLAN_CONFIG as any).USD[effectivePlan]['monthly'])
      : ((PLAN_CONFIG as any)[effectivePlan][billing] || (PLAN_CONFIG as any)[effectivePlan]['monthly']);

    if (!config) {
      logger.error({ userId: req.userId, effectivePlan, billing }, "[SUBSCRIPTION] Pricing config missing for combination");
      res.status(500).json({ error: "pricing_not_configured", message: "Pricing configuration for this plan is missing." });
      return;
    }

    // --- FIX: Race Condition ---
    // Prevent overwriting active paid subscriptions to avoid orphaned payments
    if (user.razorpaySubscriptionId && user.subscriptionStatus === "active") {
      logger.warn({ userId: req.userId }, "[SUBSCRIPTION] Blocked: Already has active subscription");
      res.status(400).json({ 
        error: "subscription_active", 
        message: "You already have an active subscription. Please manage it in Settings." 
      });
      return;
    }

    const { rzp, keyId } = getRazorpay();
    if (!rzp) {
      logger.error({ userId: req.userId }, "[SUBSCRIPTION] Razorpay client init failed");
      res.status(503).json({ error: "Payment gateway not configured" });
      return;
    }

    let subscription;
    try {
      subscription = await createSubscription(
        req.userId, 
        razorpayPlanId,
        effectivePlan.toUpperCase(), 
        user.email || undefined,
        config.totalCount
      );
    } catch (rzpErr: any) {
      const rzpDesc = rzpErr?.error?.description || rzpErr?.message || String(rzpErr);
      logger.error({ userId: req.userId, rzpErr: rzpErr?.error || rzpErr }, "[SUBSCRIPTION] Razorpay API Call Failed");
      res.status(502).json({ 
        error: "gateway_error", 
        message: `Razorpay failed: ${rzpDesc}`,
        details: rzpErr?.error || rzpErr
      });
      return;
    }

    try {
      await db.update(usersTable)
        .set({
          razorpaySubscriptionId: subscription.id,
          subscriptionStatus: "pending", 
          planType: effectivePlan,
          couponCode: couponCode || null,
          billingPeriod: billing,
          subscriptionAmount: config.amount,
        } as any)
        .where(eq(usersTable.id, req.userId));
    } catch (dbErr: any) {
      logger.error({ userId: req.userId, dbErr: dbErr.message }, "[SUBSCRIPTION] DB Update Failed after Razorpay success");
      // Note: Subscription was created but DB failed. This is a critical desync.
      res.status(500).json({ 
        error: "internal_error", 
        message: "Subscription created but failed to link to your account. Please contact support.",
        subscriptionId: subscription.id
      });
      return;
    }

    res.json({
      subscriptionId: subscription.id,
      keyId: keyId,
      planName: `GrowFlow AI ${effectivePlan.toUpperCase()}`,
      planType: effectivePlan,
      billingPeriod: billing,
      amount: config.amount,
      currency: currency,
      trialEndsAt: null,
      ghostMode: false
    });
  } catch (err: any) {
    logger.error({ 
      userId: req.userId,
      error: err.message,
      stack: err.stack
    }, "Unexpected error in subscription create");
    res.status(500).json({ error: err.message || "Internal server error" });
  }
});

router.post("/verify", requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { razorpay_payment_id, razorpay_subscription_id, razorpay_signature, planType, couponCode } = req.body;

  if (!razorpay_payment_id || !razorpay_subscription_id || !razorpay_signature) {
    res.status(400).json({ error: "Missing payment verification data" });
    return;
  }

  const currentUser = (req as any).user;
  if (!currentUser) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  const { rzp } = getRazorpay();
  if (!rzp) {
    res.status(503).json({ error: "Payment gateway not configured" });
    return;
  }

  try {
    const sub = await rzp.subscriptions.fetch(razorpay_subscription_id);
    if (!sub || (sub.notes as any)?.clerk_user_id !== req.userId) {
      logger.warn({ 
        userId: req.userId, 
        providedSubId: razorpay_subscription_id, 
        razorpayNoteId: (sub.notes as any)?.clerk_user_id 
      }, "Subscription ownership mismatch attempt blocked");
      res.status(403).json({ error: "Subscription ownership mismatch. This payment does not belong to your account." });
      return;
    }
  } catch (err: any) {
    logger.error({ err: err.message, subId: razorpay_subscription_id }, "Failed to fetch subscription for verification");
    res.status(400).json({ error: "Invalid subscription ID provided or payment gateway error" });
    return;
  }

  const appStatus = process.env.APP_STATUS || "";
  const isProd = 
    process.env.NODE_ENV === "production" || 
    appStatus === "PRODUCTION" || 
    appStatus === "BETA" ||
    !!process.env.RAILWAY_ENVIRONMENT;

  const keySecret = isProd 
    ? process.env.RAZORPAY_LIVE_KEY_SECRET
    : (process.env.RAZORPAY_TEST_KEY_SECRET?.includes("...") || !process.env.RAZORPAY_TEST_KEY_SECRET 
        ? process.env.RAZORPAY_LIVE_KEY_SECRET 
        : process.env.RAZORPAY_TEST_KEY_SECRET);

  if (!keySecret) {
    res.status(503).json({ error: "Payment gateway not configured" });
    return;
  }

  const expectedSig = crypto
    .createHmac("sha256", keySecret)
    .update(`${razorpay_payment_id}|${razorpay_subscription_id}`)
    .digest("hex");

  const signatureBuffer = Buffer.from(razorpay_signature);
  const expectedSigBuffer = Buffer.from(expectedSig);

  if (signatureBuffer.length !== expectedSigBuffer.length || !crypto.timingSafeEqual(signatureBuffer, expectedSigBuffer)) {
    res.status(400).json({ error: "Invalid payment signature" });
    return;
  }

  const effectivePlan = (planType === "infinity" ? "infinity" : planType === "creator" ? "creator" : "starter") as "starter" | "creator" | "infinity";
  const planTierStr = effectivePlan.toUpperCase();
  const credits = TIER_CREDITS[planTierStr] || 20;
  const trialEndsAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  try {
    const success = await db.transaction(async (tx) => {
      // Lock user record to prevent concurrent subscription updates
      const [lockedUser] = await tx.select()
        .from(usersTable)
        .where(eq(usersTable.id, req.userId))
        .for('update');

      if (!lockedUser) throw new Error("USER_NOT_FOUND_DURING_LOCK");

      const [existingPayment] = await tx.select()
        .from(paymentsTable)
        .where(eq(paymentsTable.id, razorpay_payment_id))
        .for('update');

      if (existingPayment) {
        return "ALREADY_PROCESSED";
      }

      await tx.insert(paymentsTable).values({
        id: razorpay_payment_id,
        userId: req.userId,
        subscriptionId: razorpay_subscription_id,
        amount: 0,
        status: "captured",
        processedAt: new Date()
      });

      await tx.update(usersTable)
        .set({ 
          subscriptionStatus: "trial", 
          planType: effectivePlan, 
          planTier: planTierStr as any,
          trialStartDate: new Date(),
          trialEndsAt: trialEndsAt,
          generationsRemaining: credits, 
          couponCode: couponCode || currentUser.couponCode || null
        } as any)
        .where(eq(usersTable.id, req.userId));

      return "SUCCESS";
    });

    if (success === "ALREADY_PROCESSED") {
      res.json({
        success: true,
        planType: currentUser.planType,
        message: "Subscription already active.",
        alreadyActive: true
      });
      return;
    }
  } catch (err: any) {
    logger.error({ err: err.message, userId: req.userId }, "Failed to verify payment transaction");
    res.status(500).json({ error: "Failed to process payment activation" });
    return;
  }

  if (couponCode) {
    await db.update(couponsTable)
      .set({ usesCount: sql`${couponsTable.usesCount} + 1` })
      .where(eq(couponsTable.code, couponCode.toUpperCase().trim()));
  }

  grantReferralReward(req.userId).catch((err: any) => logger.error({ err: String(err) }, "grantReferralReward error"));

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.userId));
  if (user && user.email) {
    await WelcomeSequence.sendPaymentSuccess(
      user.email as string, 
      "", 
      effectivePlan, 
      "7 Days Limit-Free Trial", 
      `₹${(user.subscriptionAmount || 0) / 100}`
    ).catch((err: any) => logger.error({ err: String(err) }, "sendPaymentSuccess error"));

    // WhatsApp Notification
    if ((user as any).phone) {
      sendWhatsAppMessage((user as any).phone, "subscription_active", [user.firstName || "Creator", effectivePlan]).catch(() => {});
    }
  }

  res.json({
    success: true,
    planType: effectivePlan,
    message: `${effectivePlan === "infinity" ? "Infinity" : effectivePlan === "creator" ? "Creator" : "Starter"} subscription activated. 7-day free trial started!`,
  });
  invalidateAuthCache(req.userId);
});

router.post("/credits/topup", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const { pack: packKey } = req.body as { pack: "small" | "medium" | "large" };
  const PACKS: Record<string, { credits: number; amount: number; label: string }> = {
    small: {
      credits: parseInt(process.env.RAZORPAY_TOPUP_SMALL_CREDITS || "10"),
      amount: parseInt(process.env.RAZORPAY_TOPUP_SMALL_AMOUNT || "4900"),
      label: `${process.env.RAZORPAY_TOPUP_SMALL_CREDITS || 10} credits — ₹${parseInt(process.env.RAZORPAY_TOPUP_SMALL_AMOUNT || "4900") / 100}`,
    },
    medium: {
      credits: parseInt(process.env.RAZORPAY_TOPUP_MEDIUM_CREDITS || "25"),
      amount: parseInt(process.env.RAZORPAY_TOPUP_MEDIUM_AMOUNT || "9900"),
      label: `${process.env.RAZORPAY_TOPUP_MEDIUM_CREDITS || 25} credits — ₹${parseInt(process.env.RAZORPAY_TOPUP_MEDIUM_AMOUNT || "9900") / 100}`,
    },
    large: {
      credits: parseInt(process.env.RAZORPAY_TOPUP_LARGE_CREDITS || "60"),
      amount: parseInt(process.env.RAZORPAY_TOPUP_LARGE_AMOUNT || "19900"),
      label: `${process.env.RAZORPAY_TOPUP_LARGE_CREDITS || 60} credits — ₹${parseInt(process.env.RAZORPAY_TOPUP_LARGE_AMOUNT || "19900") / 100}`,
    },
  };
  
  const pack = PACKS[packKey];
  if (!pack) {
    res.status(400).json({ error: "Invalid pack selection" });
    return;
  }

  const { rzp, keyId } = getRazorpay();
  if (!rzp) {
    res.status(503).json({ error: "Payment gateway not configured" });
    return;
  }

  try {
    const order = await rzp.orders.create({ 
      amount: pack.amount, 
      currency: "INR",
      notes: {
        clerk_user_id: req.userId,
        type: "credit_topup",
        credits: pack.credits
      }
    });
    res.json({ 
      orderId: order.id, 
      keyId: keyId,
      amount: pack.amount,
      currency: "INR",
      credits: pack.credits,
      label: pack.label
    });
  } catch (err: any) {
    logger.error({ err: err.message, userId: req.userId }, "Failed to create topup order");
    res.status(500).json({ error: "Failed to create order" });
  }
});

router.post("/credits/verify-topup", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    res.status(400).json({ error: "Missing payment verification data" });
    return;
  }

  const { rzp } = getRazorpay();
  if (!rzp) {
    res.status(503).json({ error: "Payment gateway not configured" });
    return;
  }

  const appStatus = process.env.APP_STATUS || "";
  const isProd = 
    process.env.NODE_ENV === "production" || 
    appStatus === "PRODUCTION" || 
    appStatus === "BETA" ||
    !!process.env.RAILWAY_ENVIRONMENT;

  const keySecret = isProd 
    ? (process.env.RAZORPAY_LIVE_KEY_SECRET || process.env.RAZORPAY_KEY_SECRET)
    : (process.env.RAZORPAY_TEST_KEY_SECRET && !process.env.RAZORPAY_TEST_KEY_SECRET.includes("...") 
        ? process.env.RAZORPAY_TEST_KEY_SECRET 
        : (process.env.RAZORPAY_LIVE_KEY_SECRET || process.env.RAZORPAY_KEY_SECRET));

  if (!keySecret || keySecret.includes("...")) {
    res.status(503).json({ error: "Payment gateway not configured" });
    return;
  }

  const expectedSig = crypto
    .createHmac("sha256", keySecret)
    .update(`${razorpay_order_id}|${razorpay_payment_id}`)
    .digest("hex");

  // --- FIX (MOD-1): Use timing-safe comparison to prevent timing attacks ---
  const sigBuffer = Buffer.from(razorpay_signature);
  const expectedBuffer = Buffer.from(expectedSig);
  if (sigBuffer.length !== expectedBuffer.length || !crypto.timingSafeEqual(sigBuffer, expectedBuffer)) {
    res.status(400).json({ error: "Invalid payment signature" });
    return;
  }

  // --- FIX (CRIT-3): Never trust client-supplied credits. Fetch from Razorpay order notes ---
  let verifiedCredits: number;
  try {
    const order = await rzp.orders.fetch(razorpay_order_id);
    const orderCredits = Number((order as any).notes?.credits);
    if (!orderCredits || orderCredits <= 0 || orderCredits > 200) {
      logger.error({ razorpay_order_id, notes: (order as any).notes }, "[TOPUP] Invalid or missing credits in order notes");
      res.status(400).json({ error: "Invalid order: credits not found in payment metadata" });
      return;
    }
    verifiedCredits = orderCredits;
  } catch (fetchErr: any) {
    logger.error({ err: fetchErr.message, razorpay_order_id }, "[TOPUP] Failed to fetch order from Razorpay");
    res.status(502).json({ error: "Could not verify order with payment provider" });
    return;
  }

  try {
    await db.transaction(async (tx) => {
      // Check idempotency — prevent double-crediting
      const [existingPayment] = await tx.select()
        .from(paymentsTable)
        .where(eq(paymentsTable.id, razorpay_payment_id))
        .for('update');

      if (existingPayment) {
        logger.info({ razorpay_payment_id }, "[TOPUP] Payment already processed, skipping");
        return;
      }

      await tx.update(usersTable)
        .set({
          generationsRemaining: sql`${usersTable.generationsRemaining} + ${verifiedCredits}`
        })
        .where(eq(usersTable.id, req.userId));

      await tx.insert(paymentsTable).values({
        id: razorpay_payment_id,
        userId: req.userId,
        amount: 0, 
        status: "captured",
        processedAt: new Date(),
        metadata: { razorpay_order_id, type: "credit_topup", credits: verifiedCredits }
      });
    });

    res.json({ success: true, message: `${verifiedCredits} credits added successfully!` });
    invalidateAuthCache(req.userId);
  } catch (err: any) {
    logger.error({ err: err.message, userId: req.userId }, "Failed to verify topup payment");
    res.status(500).json({ error: "Failed to process credit addition" });
  }
});



// --- FIX (CRIT-4): Removed hardcoded coupons (LAUNCH50, FRIEND15, BETA100) ---
// All coupons must now be managed via the admin panel / couponsTable in the database.
// This prevents unlimited-use 100% discount exploits.
const HARDCODED_COUPONS: Record<string, { credits: number; days: number; description: string; discount?: number; type?: 'percent' | 'flat' }> = {
  // Intentionally empty — all coupons are now DB-managed for security
};

async function validateCouponCode(code: string) {
  const normalized = code.trim().toUpperCase();
  
  // 1. Check DB first
  const [dbCoupon] = await db.select().from(couponsTable).where(eq(couponsTable.code, normalized));
  if (dbCoupon && dbCoupon.isActive) {
    if (dbCoupon.expiry && new Date(dbCoupon.expiry) < new Date()) {
      return { valid: false, reason: 'Coupon expired' };
    }
    if (dbCoupon.maxUses && dbCoupon.usesCount >= dbCoupon.maxUses) {
      return { valid: false, reason: 'Coupon usage limit reached' };
    }
    return { 
      valid: true, 
      discount: dbCoupon.discountPercent, 
      type: 'percent' as const, 
      source: 'db' as const, 
      coupon: dbCoupon,
      credits: dbCoupon.discountPercent > 0 ? 0 : 25, 
      days: 7,
      description: `Applied ${dbCoupon.code} successfully!`
    };
  }
  
  // 2. Fall back to hardcoded
  const hardcoded = HARDCODED_COUPONS[normalized];
  if (hardcoded) {
    return { 
      valid: true, 
      ...hardcoded, 
      source: 'hardcoded' as const,
      discount: hardcoded.discount || 0,
      type: hardcoded.type || 'percent'
    };
  }
  
  return { valid: false, reason: 'Invalid coupon code' };
}

router.post("/cancel", requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { rzp } = getRazorpay();
  const user = (req as any).user;

  const canCancel = user.subscriptionStatus === "active" || user.subscriptionStatus === "trial";
  
  if (rzp && user.razorpaySubscriptionId && canCancel) {
    let cancelResponse;
    try {
      cancelResponse = await rzp.subscriptions.cancel(user.razorpaySubscriptionId, true);
    } catch (e: any) {
      logger.error({ error: e }, "Razorpay cancel error");
      res.status(502).json({ 
        error: "cancellation_failed", 
        message: "Could not cancel with payment provider. Please try again or contact support." 
      });
      return;
    }

    const periodEnd = (cancelResponse as any)?.current_end 
      ? new Date((cancelResponse as any).current_end * 1000) 
      : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); 

    await db.update(usersTable)
      .set({ 
        subscriptionStatus: "canceled",
        planExpiry: periodEnd
      })
      .where(eq(usersTable.id, req.userId));
      
    // Trigger churn sequence day 1
    sendSequenceEmail(req.userId, "churn", 1).catch((e) => logger.error({ err: e.message }, "Failed to trigger churn email"));

    res.json({ 
      accessUntil: periodEnd.toISOString()
    });
    
    if (user.email) {
      import("../../services/email").then(({ sendCancellationEmail }) => {
        sendCancellationEmail(user.email, periodEnd).catch(() => {});
      }).catch(() => {});
    }
    invalidateAuthCache(req.userId);
  } else {
    res.status(400).json({ error: "No active subscription to cancel" });
  }
});

router.post("/retry", requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { rzp } = getRazorpay();
  const user = (req as any).user;

  if (rzp && user.razorpaySubscriptionId) {
    try {
      await rzp.subscriptions.cancel(user.razorpaySubscriptionId, false);
    } catch (e) {
      logger.error({ error: e }, "Razorpay cancel (retry) error");
    }
  }

  await db.update(usersTable)
    .set({
      subscriptionStatus: "pending",
      razorpaySubscriptionId: null,
    })
    .where(eq(usersTable.id, req.userId));

  res.json({ success: true, planType: "free" });
  invalidateAuthCache(req.userId);
});

router.get("/validate-coupon", requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { code } = req.query as { code?: string };
  if (!code) {
    res.status(400).json({ error: "No code provided" });
    return;
  }
  
  const result = await validateCouponCode(code);
  if (!result.valid) {
    res.status(400).json({ error: result.reason });
    return;
  }
  
  res.json({ success: true, discountPercent: result.discount });
});

router.post("/apply-coupon", requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { code } = req.body as { code?: string };
  if (!code || typeof code !== 'string') {
    res.status(400).json({ error: "Invalid coupon code" });
    return;
  }
  
  const result = await validateCouponCode(code);
  if (!result.valid) {
    res.status(400).json({ error: result.reason });
    return;
  }
  
  const [user] = await db.select({ couponCode: usersTable.couponCode }).from(usersTable).where(eq(usersTable.id, req.userId));
  if (user?.couponCode) {
    res.status(400).json({ error: "You have already used a coupon code" });
    return;
  }
  
  const updates: any = { couponCode: code.trim().toUpperCase() };
  if (result.credits && result.credits > 0) updates.generationsRemaining = sql`${usersTable.generationsRemaining} + ${result.credits}`;
  if (result.days && result.days > 0) {
    const base = new Date();
    updates.trialEndsAt = new Date(base.getTime() + result.days * 24 * 60 * 60 * 1000);
    updates.subscriptionStatus = "trial";
  }
  
  await db.update(usersTable).set(updates).where(eq(usersTable.id, req.userId));
  
  if (result.source === 'db' && result.coupon) {
    await db.update(couponsTable)
      .set({ usesCount: sql`${couponsTable.usesCount} + 1` })
      .where(eq(couponsTable.code, result.coupon.code));
  }

  res.json({ success: true, message: result.description });
  invalidateAuthCache(req.userId);
});



router.post("/webhook", async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!webhookSecret) {
    logger.error("[CRITICAL] RAZORPAY_WEBHOOK_SECRET is missing. Rejecting all webhooks for security.");
    res.status(500).json({ error: "Webhook verification misconfigured" });
    return;
  }

  const signature = req.headers["x-razorpay-signature"] as string;
  const expectedSig = crypto
    .createHmac("sha256", webhookSecret)
    .update((req as any).rawBody || "")
    .digest("hex");

  if (!signature || !expectedSig || signature.length !== expectedSig.length || !crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSig))) {
    logger.error("[WEBHOOK] Invalid signature or timing mismatch detected");
    res.status(400).json({ error: "Invalid webhook signature" });
    return;
  }

  const event = req.body;
  const subscriptionId = event?.payload?.subscription?.entity?.id;

  if (!subscriptionId) { res.json({ received: true }); return; }

  const statusMap: Record<string, string> = {
    "subscription.activated": "active",
    "subscription.charged": "active",
    "subscription.updated": "active",
    "subscription.halted": "past_due",
    "subscription.cancelled": "canceled",
    "subscription.expired": "canceled",
  };

  const newStatus = statusMap[event.event];
  if (newStatus) {
    const updates: any = { subscriptionStatus: newStatus };
    
    if (newStatus === "canceled") {
      // Grace Period Logic: Only downgrade if the event is 'expired'
      if (event.event === "subscription.expired") {
        updates.planType = "free";
        updates.planTier = "FREE";
      }
    } else if (newStatus === "active" || event.event === "subscription.activated" || event.event === "subscription.updated") {
      const planId = event?.payload?.subscription?.entity?.plan_id;
      if (planId) {
        const pType = getTierFromPlanId(planId);
        if (!pType) {
          logger.error(`[WEBHOOK_CRITICAL] Unmapped Razorpay Plan ID received: ${planId}. Rejecting webhook to prevent silent downgrade.`);
          res.status(400).json({ error: "Unmapped Plan ID. Webhook failed." });
          return;
        }
        
        updates.planType = pType;
        updates.planTier = pType.toUpperCase() as any;
      }
    }
    const updatedUsers = await db.update(usersTable)
      .set(updates)
      .where(eq(usersTable.razorpaySubscriptionId, subscriptionId))
      .returning({ id: usersTable.id, email: usersTable.email, planType: usersTable.planType, billingPeriod: usersTable.billingPeriod });

    if (event.event === "subscription.charged" && updatedUsers.length > 0) {
      const payload = event?.payload?.payment?.entity;
      const paymentId = payload?.id;
      const currentEnd = event?.payload?.subscription?.entity?.current_end;
      const planExpiry = currentEnd ? new Date(currentEnd * 1000) : null;

      for (const u of updatedUsers) {
        try {
          await db.transaction(async (tx) => {
            const [existingPayment] = await tx.select()
              .from(paymentsTable)
              .where(eq(paymentsTable.id, paymentId))
              .for('update'); 

            if (existingPayment) {
              logger.info({ paymentId }, "Payment already processed in transaction, skipping.");
              return;
            }

            const planTierStr = (u.planType ?? "starter").toUpperCase();
            const credits = TIER_CREDITS[planTierStr] || 20;

            await tx.insert(paymentsTable).values({
              id: paymentId,
              userId: u.id,
              subscriptionId: subscriptionId,
              amount: payload.amount / 100,
              status: "captured",
              processedAt: new Date(),
              metadata: event.payload
            });

            await tx.update(usersTable)
              .set({ 
                generationsRemaining: credits, 
                subscriptionStatus: "active",
                planExpiry: planExpiry
              })
              .where(eq(usersTable.id, u.id));

            logger.info({ userId: u.id, credits }, "Webhook: Payment verified and credits reset successfully");
          });
        } catch (err: any) {
          logger.error({ err: err?.message, paymentId }, "FAILED_TO_PROCESS_WEBHOOK_TRANSACTION");
          res.status(500).json({ status: "error", message: "Internal transaction failure" });
          return;
        }

        invalidateAuthCache(u.id);
        
        grantReferralReward(u.id).catch((err: any) => logger.error({ err: String(err), userId: u.id }, "grantReferralReward webhook error"));
        
        if (u.email) {
          const planName = u.planType === 'infinity' ? 'Infinity' : u.planType === 'creator' ? 'Creator' : 'Starter';
          const chargedAmount = payload.amount;
          const billingPeriod = u.billingPeriod || 'monthly';
          
          import("../../services/email").then(({ sendPaymentSuccessEmail, sendRenewalEmail }) => {
             // For simplicity, we call both or we can just call success if it's new. 
             // sendPaymentSuccessEmail is more detailed as requested.
             sendPaymentSuccessEmail(u.email!, planName, chargedAmount, billingPeriod).catch(() => {});
             sendRenewalEmail(u.email!, planName).catch(() => {});
          }).catch((err: any) => logger.error({ err: String(err), email: u.email }, "Email sending error in webhook"));
        }
      }
    } else if (newStatus === "past_due" && updatedUsers.length > 0) {
      for (const u of updatedUsers) {
        if (u.email) await sendPaymentFailedEmail(u.email);
        
        await db.update(usersTable)
          .set({ paymentFailedAt: new Date() })
          .where(eq(usersTable.id, u.id));
        
        invalidateAuthCache(u.id);
        
        await db.insert(securityLogsTable).values({
          id: crypto.randomUUID(),
          userId: u.id,
          eventType: "AUTH_FAILURE" as any,
          ipAddress: "razorpay-webhook",
          userAgent: "razorpay",
          metadata: { event: event.event, reason: "Subscription halted or failed" }
        }).catch(() => {});
      }
    }
  } else if (event.event === "payment.failed") {
    const subId = event?.payload?.payment?.entity?.subscription_id;
    if (subId) {
      const users = await db.select().from(usersTable).where(eq(usersTable.razorpaySubscriptionId, subId));
      for (const u of users) {
        if (u.email) await sendPaymentFailedEmail(u.email);
        
        await db.insert(securityLogsTable).values({
          id: crypto.randomUUID(),
          userId: u.id,
          eventType: "AUTH_FAILURE" as any,
          ipAddress: "razorpay-webhook",
          userAgent: "razorpay",
          metadata: { event: event.event, reason: "Payment execution failure" }
        }).catch(() => {});
      }
    }
  }

  res.json({ received: true });
});

export default router;
