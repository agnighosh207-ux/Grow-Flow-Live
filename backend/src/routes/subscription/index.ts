import { Router, type IRouter } from "express";
import { getAuth } from "@clerk/express";
import { eq, count, gte, and, sql } from "drizzle-orm";
import { db, usersTable, contentGenerationsTable, couponsTable, securityLogsTable, paymentsTable } from "@workspace/db";
import crypto from "crypto";
import { FREE_TRIALS_PER_TOOL, isPaidOrTrial, consumeToolTrial, requireAuth, getOrCreateUser } from "../../middlewares/planMiddleware";
import { WelcomeSequence } from "../../lib/WelcomeSequence";
import { AuthenticatedRequest } from "../../types";
import { Response } from "express";
import { ensureReferralCode, grantReferralReward } from "../referral";
import { sendWelcomeEmail, sendPaymentFailedEmail } from "../../services/email";
import { createSubscription } from "../../services/payment-service";
import { getRazorpayPlanId } from "../../utils/planRouter";
import Razorpay from "razorpay";

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

function computePlan(user: any, totalGenerations: number, monthlyGenerations: number) {
  const now = new Date();
  const planType = (user.planType || "free") as "free" | "starter" | "creator" | "infinity";
  const generationsRemaining = user.generationsRemaining ?? 0;

  if (user.subscriptionStatus === "active") {
    if (planType === "starter") {
      return {
        plan: "active" as const, planType,
        canGenerate: generationsRemaining > 0,
        trialDaysLeft: null, generationLimit: 20,
        monthlyGenerationsUsed: 20 - generationsRemaining,
        totalGenerationsUsed: totalGenerations,
      };
    }
    if (planType === "creator") {
      return {
        plan: "active" as const, planType,
        canGenerate: generationsRemaining > 0,
        trialDaysLeft: null, generationLimit: 100,
        monthlyGenerationsUsed: 100 - generationsRemaining,
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
        trialDaysLeft: daysLeft, generationLimit: 300, // Soft limit
        monthlyGenerationsUsed: monthlyGenerations,
        totalGenerationsUsed: totalGenerations,
      };
    }
  }

  if (user.subscriptionStatus === "trial" && user.trialEndsAt && new Date(user.trialEndsAt) > now) {
    const msLeft = new Date(user.trialEndsAt).getTime() - now.getTime();
    const daysLeft = Math.ceil(msLeft / (1000 * 60 * 60 * 24));
    return {
      plan: "trial" as const, planType: "creator",
      canGenerate: generationsRemaining > 0,
      trialDaysLeft: daysLeft, generationLimit: 100,
      monthlyGenerationsUsed: 100 - generationsRemaining,
      totalGenerationsUsed: totalGenerations,
    };
  }

  // Handle pending status — user initiated payment but hasn't completed it yet
  // Preserve their planType so they don't appear downgraded
  if (user.subscriptionStatus === "pending" && planType !== "free") {
    const tierLimits: Record<string, number> = { starter: 20, creator: 100, infinity: 9999 };
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
    const tierLimits: Record<string, number> = { starter: 20, creator: 100, infinity: 9999 };
    const limit = tierLimits[planType] || 5;
    return {
      plan: "past_due" as const, planType,
      canGenerate: generationsRemaining > 0,
      trialDaysLeft: null, generationLimit: limit,
      monthlyGenerationsUsed: limit - generationsRemaining,
      totalGenerationsUsed: totalGenerations,
    };
  }

  // Fallback to free (genuinely free users, or fully canceled/blocked users whose planType IS "free")
  return {
    plan: "free" as const, planType: planType !== "free" ? planType : "free" as const,
    canGenerate: generationsRemaining > 0,
    trialDaysLeft: null, generationLimit: planType !== "free" ? 5 : 5,
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

router.get("/subscription/status", requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
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
    generationsUsed: totalGenerations,
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
    monthly: { amount: 10900, period: "monthly" as const, interval: 1, totalCount: 12 },
    yearly: { amount: 109000, period: "yearly" as const, interval: 1, totalCount: 1 },
  },
  creator: {
    displayName: "Creator",
    monthly: { amount: 29900, period: "monthly" as const, interval: 1, totalCount: 12 },
    yearly: { amount: 299000, period: "yearly" as const, interval: 1, totalCount: 1 },
  },
  infinity: {
    displayName: "Infinity",
    monthly: { amount: 49900, period: "monthly" as const, interval: 1, totalCount: 12 },
    yearly: { amount: 499000, period: "yearly" as const, interval: 1, totalCount: 1 },
  },
};

router.post("/subscription/create", requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const user = await getOrCreateUser(req.userId);
    const { planType, couponCode, billingPeriod } = req.body as {
      planType?: "starter" | "creator" | "infinity";
      couponCode?: string;
      billingPeriod?: "monthly" | "quarterly" | "half-yearly" | "yearly";
    };
    
    if (!planType) {
      res.status(400).json({ error: "planType is required" });
      return;
    }

    const effectivePlan = (planType === "infinity" ? "infinity" : planType === "creator" ? "creator" : "starter") as "starter" | "creator" | "infinity";
    const billing = (billingPeriod === "yearly" ? "yearly" : billingPeriod === "half-yearly" ? "half-yearly" : billingPeriod === "quarterly" ? "quarterly" : "monthly");
    
    let razorpayPlanId: string;
    try {
      razorpayPlanId = getRazorpayPlanId(effectivePlan, billing);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
      return;
    }

    const config = (PLAN_CONFIG as any)[effectivePlan][billing === 'monthly' ? 'monthly' : 'yearly'] || (PLAN_CONFIG as any)[effectivePlan]['monthly'];

    // Ensure we trigger the secure .env mapped Razorpay Subscription Engine
    const subscription = await createSubscription(
      req.userId, 
      razorpayPlanId,
      effectivePlan.toUpperCase(), 
      user.email || undefined,
      120 // Set to high number for continuous autopay as per Task 3
    );

    const trialEndsAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await db.update(usersTable)
      .set({
        razorpaySubscriptionId: subscription.id,
        subscriptionStatus: "pending", 
        planType: effectivePlan,
        trialEndsAt: trialEndsAt,
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
      currency: "INR",
      trialEndsAt: trialEndsAt.toISOString(),
      ghostMode: false
    });
  } catch (err: any) {
    const errorMsg = err?.error?.description || err?.message || "Failed to create subscription";
    console.error("Subscription create error:", err?.error || err);
    res.status(500).json({ error: errorMsg });
  }
});

router.post("/subscription/verify", requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { razorpay_payment_id, razorpay_subscription_id, razorpay_signature, planType, couponCode } = req.body;

  if (!razorpay_payment_id || !razorpay_subscription_id || !razorpay_signature) {
    res.status(400).json({ error: "Missing payment verification data" });
    return;
  }

  const isProd = process.env.NODE_ENV === "production" && process.env.APP_STATUS !== "BETA";
  const keySecret = isProd 
    ? (process.env.RAZORPAY_LIVE_KEY_SECRET || process.env.RAZORPAY_KEY_SECRET)
    : (process.env.RAZORPAY_TEST_KEY_SECRET || process.env.RAZORPAY_KEY_SECRET);

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

  // Idempotency check (Flaw 27 fix)
  const [currentUser] = await db.select().from(usersTable).where(eq(usersTable.id, req.userId));
  if (currentUser && currentUser.subscriptionStatus === "active" && currentUser.razorpaySubscriptionId === razorpay_subscription_id) {
    res.json({
      success: true,
      planType: currentUser.planType,
      message: "Subscription already active.",
      alreadyActive: true
    });
    return;
  }

  const tierCredits: Record<string, number> = {
    starter: 20,
    creator: 100,
    infinity: 9999
  };

  const effectivePlan = (planType === "infinity" ? "infinity" : planType === "creator" ? "creator" : "starter") as "starter" | "creator" | "infinity";

  // Record initial payment (Idempotency)
  if (razorpay_payment_id) {
    const [existing] = await db.select().from(paymentsTable).where(eq(paymentsTable.id, razorpay_payment_id));
    if (!existing) {
       await db.insert(paymentsTable).values({
         id: razorpay_payment_id,
         userId: req.userId,
         subscriptionId: razorpay_subscription_id,
         amount: 0, // Verification only, actual amount synced via webhook
         status: "captured",
         processedAt: new Date()
       }).catch(() => {});
    }
  }

  const trialEndsAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  await db.update(usersTable)
    .set({ 
      subscriptionStatus: "active", 
      planType: effectivePlan, 
      planTier: effectivePlan.toUpperCase() as any,
      trialStartDate: new Date(),
      trialEndsAt: trialEndsAt,
      generationsRemaining: tierCredits[effectivePlan] || 20,
      couponCode: couponCode || (currentUser as any).couponCode || null
    } as any)
    .where(eq(usersTable.id, req.userId));

  if (couponCode) {
    await db.update(couponsTable)
      .set({ usesCount: sql`${couponsTable.usesCount} + 1` })
      .where(eq(couponsTable.code, couponCode.toUpperCase().trim()));
  }

  grantReferralReward(req.userId).catch(err => console.error("grantReferralReward error:", err));

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.userId));
  if (user && user.email) {
    await WelcomeSequence.sendPaymentSuccess(
      user.email as string, 
      "", 
      effectivePlan, 
      "7 Days Limit-Free Trial", 
      "₹0"
    ).catch(err => console.error("sendPaymentSuccess error:", err));
  }

  res.json({
    success: true,
    planType: effectivePlan,
    message: `${effectivePlan === "infinity" ? "Infinity" : effectivePlan === "creator" ? "Creator" : "Starter"} subscription activated. 7-day free trial started!`,
  });
});

router.post("/subscription/cancel", requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const razorpay = getRazorpay();
  const user = await getOrCreateUser(req.userId);

  if (razorpay && user.razorpaySubscriptionId) {
    try {
      await razorpay.subscriptions.cancel(user.razorpaySubscriptionId, true);
    } catch (e: any) {
      console.error("Razorpay cancel error:", e);
      res.status(502).json({ 
        error: "cancellation_failed", 
        message: "Could not cancel with payment provider. Please try again or contact support." 
      });
      return;
    }
  }

  // We do NOT downgrade immediately in the DB.
  // Razorpay will keep the subscription active until the end of the period (cancel_at_cycle_end: 1).
  // The /subscription/webhook handler will process 'subscription.cancelled' and downgrade the user then.

  res.json({ success: true, message: "Subscription will end at period close." });
});

router.post("/subscription/retry", requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const razorpay = getRazorpay();
  const user = await getOrCreateUser(req.userId);

  if (razorpay && user.razorpaySubscriptionId) {
    try {
      await razorpay.subscriptions.cancel(user.razorpaySubscriptionId, false);
    } catch (e) {
      console.error("Razorpay cancel (retry) error:", e);
    }
  }

  const previousPlan = ["infinity", "creator", "starter"].includes(user.planType) ? user.planType : "starter";

  // Only clear the razorpay subscription ID and set status to pending-retry.
  // Do NOT reset planType/planTier — that should only happen via webhook on actual cancellation.
  await db.update(usersTable)
    .set({
      subscriptionStatus: "free",
      razorpaySubscriptionId: null,
      // Preserve planType and planTier so the user can re-subscribe
    })
    .where(eq(usersTable.id, req.userId));

  res.json({ success: true, planType: previousPlan });
});

router.get("/subscription/validate-coupon", requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
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

router.get("/trial/status", requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.userId));
    if (!user) {
      res.json({ ideas: 0, strategy: 0, hooks: 0, limit: 0, isPaid: false });
      return;
    }
    res.json({
      ideas: 0,
      strategy: 0,
      hooks: 0,
      limit: user.generationsRemaining,
      isPaid: isPaidOrTrial(user),
    });
  } catch {
    res.status(500).json({ error: "Failed to fetch trial status." });
  }
});

router.post("/trial/use", requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { toolKey } = req.body as { toolKey?: string };
  if (!toolKey || !["ideas", "strategy", "hooks"].includes(toolKey)) {
    res.status(400).json({ error: "Invalid tool key." });
    return;
  }
  try {
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.userId));
    if (!user) { res.status(404).json({ error: "User not found." }); return; }

    if (isPaidOrTrial(user)) {
      res.json({ used: FREE_TRIALS_PER_TOOL, limit: FREE_TRIALS_PER_TOOL, isPaid: true });
      return;
    }

    const newCount = await consumeToolTrial(req.userId, toolKey);
    const [updatedUser] = await db.select().from(usersTable).where(eq(usersTable.id, req.userId));
    res.json({ used: 0, limit: updatedUser?.generationsRemaining ?? 0, isPaid: false });
  } catch {
    res.status(500).json({ error: "Failed to record trial usage." });
  }
});

router.post("/user/login", requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { deviceId, email } = req.body as { deviceId?: string; email?: string };
    const updates: any = { lastLoginAt: new Date() };
    if (deviceId) updates.deviceId = deviceId;
    if (email) updates.email = email;

    await db.update(usersTable).set(updates).where(eq(usersTable.id, req.userId));
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: "Failed to update login info." });
  }
});

router.post("/subscription/webhook", async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (webhookSecret) {
    const signature = req.headers["x-razorpay-signature"];
    const expectedSig = crypto
      .createHmac("sha256", webhookSecret)
      .update((req as any).rawBody || "")
      .digest("hex");
    if (signature !== expectedSig) {
      res.status(400).json({ error: "Invalid webhook signature" });
      return;
    }
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
    
    // Sync planTier and planType
    if (newStatus === "canceled" || newStatus === "expired") {
      // Grace Period Logic: Only downgrade if the event is actually 'expired' or 'cancelled' (end of cycle)
      // Note: subscription.cancelled in Razorpay is sent at the end of the period if cancel_at_cycle_end=1
      updates.planType = "free";
      updates.planTier = "FREE";
    } else if (newStatus === "active" || event.event === "subscription.activated" || event.event === "subscription.updated") {
      const planId = event?.payload?.subscription?.entity?.plan_id;
      if (planId) {
        let pType = "starter";
        const env = process.env;
        
        // Dynamic Tier Detection
        if (Object.keys(env).some(k => k.startsWith('RAZORPAY_PLAN_INFINITY') && env[k] === planId)) {
          pType = "infinity";
        } else if (Object.keys(env).some(k => k.startsWith('RAZORPAY_PLAN_CREATOR') && env[k] === planId)) {
          pType = "creator";
        } else if (Object.keys(env).some(k => k.startsWith('RAZORPAY_PLAN_STARTER') && env[k] === planId)) {
          pType = "starter";
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
      const paymentId = event?.payload?.payment?.entity?.id;
      const amount = event?.payload?.payment?.entity?.amount;
      const currentEnd = event?.payload?.subscription?.entity?.current_end;
      const planExpiry = currentEnd ? new Date(currentEnd * 1000) : null;

      for (const u of updatedUsers) {
        // IDEMPOTENCY CHECK
        if (paymentId) {
          const [existingPayment] = await db.select().from(paymentsTable).where(eq(paymentsTable.id, paymentId));
          if (existingPayment) {
            console.log(`[Webhook] Skipping already processed payment: ${paymentId}`);
            continue; 
          }
          
          await db.insert(paymentsTable).values({
            id: paymentId,
            userId: u.id,
            subscriptionId: subscriptionId,
            amount: amount || 0,
            status: "captured",
            processedAt: new Date(),
            metadata: event.payload
          });
        }

        const tierCredits: Record<string, number> = { starter: 20, creator: 100, infinity: 9999 };
        const credits = tierCredits[u.planType ?? "starter"] ?? 20;
        
        await db.update(usersTable)
          .set({ 
            generationsRemaining: credits, 
            lastCreditReset: new Date(),
            planExpiry: planExpiry
          })
          .where(eq(usersTable.id, u.id));
        
        grantReferralReward(u.id).catch(err => console.error("grantReferralReward webhook error:", err));
        
        if (u.email) {
          import("../../services/email").then(({ sendRenewalEmail }) => {
             sendRenewalEmail(u.email!, u.planType === 'infinity' ? 'Infinity' : u.planType === 'creator' ? 'Creator' : 'Starter');
          }).catch(err => console.error("sendRenewalEmail error:", err));
        }
      }
    } else if (newStatus === "past_due" && updatedUsers.length > 0) {
      for (const u of updatedUsers) {
        if (u.email) await sendPaymentFailedEmail(u.email);
        
        await db.insert(securityLogsTable).values({
          id: crypto.randomUUID(),
          userId: u.id,
          eventType: "AUTH_FAILURE" as any,
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
          metadata: { event: event.event, reason: "Payment execution failure" }
        }).catch(() => {});
      }
    }
  }

  res.json({ received: true });
});

export default router;
