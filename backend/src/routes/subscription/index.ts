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
import { createSubscription } from "../../services/payment-service";
import { getRazorpayPlanId } from "../../utils/planRouter";
import Razorpay from "razorpay";
import { invalidateAuthCache } from "../../middlewares/authSyncMiddleware";

const router: IRouter = Router();

function getRazorpay() {
  const isProd = process.env.NODE_ENV === "production" && process.env.APP_STATUS !== "BETA";
  const keyId = isProd ? process.env.RAZORPAY_LIVE_KEY_ID : process.env.RAZORPAY_TEST_KEY_ID;
  const fallbackKeyId = process.env.RAZORPAY_KEY_ID; 
  
  const finalKeyId = keyId || fallbackKeyId;
  const finalKeySecret = isProd 
    ? (process.env.RAZORPAY_LIVE_KEY_SECRET || process.env.RAZORPAY_KEY_SECRET)
    : (process.env.RAZORPAY_TEST_KEY_SECRET || process.env.RAZORPAY_KEY_SECRET);

  if (!finalKeyId || !finalKeySecret) return null;
  return new Razorpay({ key_id: finalKeyId, key_secret: finalKeySecret });
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
  const generationsRemaining = user.generationsRemaining ?? 0;

  if (user.isAdmin) {
    return {
      plan: "active" as const, planType: "infinity",
      canGenerate: true,
      trialDaysLeft: null, generationLimit: 999,
      monthlyGenerationsUsed: monthlyGenerations,
      totalGenerationsUsed: totalGenerations,
    };
  }

  if (user.subscriptionStatus === "active") {
    if (planType === "starter") {
      return {
        plan: "active" as const, planType,
        canGenerate: generationsRemaining > 0,
        trialDaysLeft: null, generationLimit: 25,
        monthlyGenerationsUsed: Math.max(0, 25 - generationsRemaining),
        totalGenerationsUsed: totalGenerations,
      };
    }
    if (planType === "creator") {
      return {
        plan: "active" as const, planType,
        canGenerate: generationsRemaining > 0,
        trialDaysLeft: null, generationLimit: 150,
        monthlyGenerationsUsed: Math.max(0, 150 - generationsRemaining),
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
        totalGenerationsUsed: totalGenerations,
      };
    }
  }

  if (user.subscriptionStatus === "trial" && user.trialEndsAt && new Date(user.trialEndsAt) > now) {
    const msLeft = new Date(user.trialEndsAt).getTime() - now.getTime();
    const daysLeft = Math.ceil(msLeft / (1000 * 60 * 60 * 24));
    
    const tierLimits: Record<string, number> = { starter: 25, creator: 150, infinity: 9999 };
    const limit = tierLimits[planType] || 5;

    return {
      plan: "trial" as const, planType,
      canGenerate: planType === "infinity" ? true : generationsRemaining > 0,
      trialDaysLeft: daysLeft, generationLimit: limit,
      monthlyGenerationsUsed: Math.max(0, limit - generationsRemaining),
      totalGenerationsUsed: totalGenerations,
    };
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
      totalGenerationsUsed: totalGenerations,
    };
  }

  // Fallback to free (genuinely free users, or fully canceled/blocked users)
  // Use actual DB credits — don't force-zero any tier
  return {
    plan: "free" as const, planType: "free" as const,
    canGenerate: generationsRemaining > 0,
    trialDaysLeft: null, generationLimit: 5,
    monthlyGenerationsUsed: 5 - Math.min(generationsRemaining, 5),
    totalGenerationsUsed: totalGenerations,
  };
}

function getMonthlyWindowStart(user: any): Date {
  const now = new Date();
  // Use trialStartDate for paid users, fallback to createdAt for free users to ensure 30-day rolling window for all
  const baseDate = user.trialStartDate || user.createdAt || now;
  const subStart = new Date(baseDate);
  const msIn30Days = 30 * 24 * 60 * 60 * 1000;
  const msSinceStart = now.getTime() - subStart.getTime();
  const cycleNumber = Math.floor(msSinceStart / msIn30Days);
  return new Date(subStart.getTime() + cycleNumber * msIn30Days);
}

router.get("/status", requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const user = await getOrCreateUser(req.userId);

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

router.post("/create", requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const user = await getOrCreateUser(req.userId);
    const { planType, couponCode, billingPeriod, currency = "INR" } = req.body as {
      planType?: "starter" | "creator" | "infinity";
      couponCode?: string;
      billingPeriod?: "monthly" | "quarterly" | "half-yearly" | "yearly";
      currency?: "INR" | "USD";
    };
    
    if (!planType) {
      res.status(400).json({ error: "planType is required" });
      return;
    }

    const effectivePlan = (planType === "infinity" ? "infinity" : planType === "creator" ? "creator" : "starter") as "starter" | "creator" | "infinity";
    const billing = (billingPeriod === "yearly" ? "yearly" : billingPeriod === "half-yearly" ? "half-yearly" : billingPeriod === "quarterly" ? "quarterly" : "monthly");
    
    let razorpayPlanId: string;
    try {
      razorpayPlanId = getRazorpayPlanId(effectivePlan, billing, currency);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
      return;
    }

    const config = currency === "USD" 
      ? ((PLAN_CONFIG as any).USD[effectivePlan][billing] || (PLAN_CONFIG as any).USD[effectivePlan]['monthly'])
      : ((PLAN_CONFIG as any)[effectivePlan][billing] || (PLAN_CONFIG as any)[effectivePlan]['monthly']);

    const subscription = await createSubscription(
      req.userId, 
      razorpayPlanId,
      effectivePlan.toUpperCase(), 
      user.email || undefined,
      120 
    );

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

    res.json({
      subscriptionId: subscription.id,
      planName: `GrowFlow AI ${effectivePlan.toUpperCase()}`,
      planType: effectivePlan,
      billingPeriod: billing,
      amount: config.amount,
      currency: currency,
      trialEndsAt: null,
      ghostMode: false
    });
  } catch (err: any) {
    const errorMsg = err?.error?.description || err?.message || "Failed to create subscription";
    logger.error({ error: err?.error || err }, "Subscription create error");
    res.status(500).json({ error: errorMsg });
  }
});

router.post("/verify", requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { razorpay_payment_id, razorpay_subscription_id, razorpay_signature, planType, couponCode } = req.body;

  if (!razorpay_payment_id || !razorpay_subscription_id || !razorpay_signature) {
    res.status(400).json({ error: "Missing payment verification data" });
    return;
  }

  const [currentUser] = await db.select().from(usersTable).where(eq(usersTable.id, req.userId));
  if (!currentUser) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  const rzp = getRazorpay();
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

  const isProd = process.env.NODE_ENV === "production" && process.env.APP_STATUS !== "BETA";
  const keySecret = isProd 
    ? process.env.RAZORPAY_LIVE_KEY_SECRET
    : process.env.RAZORPAY_TEST_KEY_SECRET;

  if (!keySecret) {
    res.status(503).json({ error: "Payment gateway not configured" });
    return;
  }

  const expectedSig = crypto
    .createHmac("sha256", keySecret)
    .update(`${razorpay_payment_id}|${razorpay_subscription_id}`)
    .digest("hex");

  if (expectedSig !== razorpay_signature) {
    res.status(400).json({ error: "Invalid payment signature" });
    return;
  }

  const effectivePlan = (planType === "infinity" ? "infinity" : planType === "creator" ? "creator" : "starter") as "starter" | "creator" | "infinity";
  const planTierStr = effectivePlan.toUpperCase();
  const credits = TIER_CREDITS[planTierStr] || 20;
  const trialEndsAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  try {
    const success = await db.transaction(async (tx) => {
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
  }

  res.json({
    success: true,
    planType: effectivePlan,
    message: `${effectivePlan === "infinity" ? "Infinity" : effectivePlan === "creator" ? "Creator" : "Starter"} subscription activated. 7-day free trial started!`,
  });
});


router.post("/cancel", requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const razorpay = getRazorpay();
  const user = await getOrCreateUser(req.userId);

  const canCancel = user.subscriptionStatus === "active" || user.subscriptionStatus === "trial";
  
  if (razorpay && user.razorpaySubscriptionId && canCancel) {
    try {
      await razorpay.subscriptions.cancel(user.razorpaySubscriptionId, true);
    } catch (e: any) {
      logger.error({ error: e }, "Razorpay cancel error");
      res.status(502).json({ 
        error: "cancellation_failed", 
        message: "Could not cancel with payment provider. Please try again or contact support." 
      });
      return;
    }
  }

  res.json({ success: true, message: "Subscription will end at period close." });
});

router.post("/retry", requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const razorpay = getRazorpay();
  const user = await getOrCreateUser(req.userId);

  if (razorpay && user.razorpaySubscriptionId) {
    try {
      await razorpay.subscriptions.cancel(user.razorpaySubscriptionId, false);
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
});

router.get("/validate-coupon", requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { code } = req.query as { code?: string };
  if (!code) {
    res.status(400).json({ error: "No code provided" });
    return;
  }
  const [coupon] = await db.select().from(couponsTable).where(eq(couponsTable.code, code));
  if (!coupon || !coupon.isActive) {
    res.status(404).json({ error: "Invalid or inactive coupon code" });
    return;
  }
  if (coupon.expiry && new Date(coupon.expiry) < new Date()) {
    res.status(400).json({ error: "Coupon code has expired" });
    return;
  }
  if (coupon.maxUses && coupon.usesCount >= coupon.maxUses) {
    res.status(400).json({ error: "Coupon usage limit reached" });
    return;
  }
  res.json({ success: true, discountPercent: coupon.discountPercent });
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
      .returning({ id: usersTable.id, email: usersTable.email, planType: usersTable.planType });

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
          import("../../services/email").then(({ sendRenewalEmail }) => {
             sendRenewalEmail(u.email!, u.planType === 'infinity' ? 'Infinity' : u.planType === 'creator' ? 'Creator' : 'Starter');
          }).catch((err: any) => logger.error({ err: String(err), email: u.email }, "sendRenewalEmail error"));
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
