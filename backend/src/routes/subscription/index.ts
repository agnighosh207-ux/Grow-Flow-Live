import { Router, type IRouter } from "express";
import { getAuth } from "@clerk/express";
import { eq, count, gte, and } from "drizzle-orm";
import { db, usersTable, contentGenerationsTable, couponsTable } from "@workspace/db";
import crypto from "crypto";
import { FREE_TRIALS_PER_TOOL, isPaidOrTrial, consumeToolTrial } from "../../middlewares/planMiddleware";
import { ensureReferralCode, grantReferralReward } from "../referral";
import { createSubscription } from "../../services/payment-service";

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
  const Razorpay = require("razorpay");
  return new Razorpay({ key_id: finalKeyId, key_secret: finalKeySecret });
}

const requireAuth = (req: any, res: any, next: any) => {
  const auth = getAuth(req);
  const userId = auth?.sessionClaims?.userId || auth?.userId;
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }
  req.userId = userId;
  next();
};

async function getOrCreateUser(userId: string, email?: string) {
  let [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
  if (!user) {
    [user] = await db.insert(usersTable).values({ id: userId, email: email ?? null }).returning();
  }
  if (!user.referralCode) {
    await ensureReferralCode(userId);
    [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
  }
  return user;
}

function computePlan(user: any, totalGenerations: number, monthlyGenerations: number) {
  const now = new Date();
  const planType = (user.planType || "free") as "free" | "starter" | "creator" | "infinity";

  if (user.subscriptionStatus === "active") {
    if (planType === "starter") {
      return {
        plan: "active" as const, planType,
        canGenerate: monthlyGenerations < 20,
        trialDaysLeft: null, generationLimit: 20,
        monthlyGenerationsUsed: monthlyGenerations,
        totalGenerationsUsed: totalGenerations,
      };
    }
    if (planType === "creator") {
      return {
        plan: "active" as const, planType,
        canGenerate: monthlyGenerations < 100,
        trialDaysLeft: null, generationLimit: 100,
        monthlyGenerationsUsed: monthlyGenerations,
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
      canGenerate: monthlyGenerations < 100,
      trialDaysLeft: daysLeft, generationLimit: 100,
      monthlyGenerationsUsed: monthlyGenerations,
      totalGenerationsUsed: totalGenerations,
    };
  }

  // Fallback to free (or if canceled/blocked)
  return {
    plan: "free" as const, planType: "free" as const,
    canGenerate: totalGenerations < 3,
    trialDaysLeft: null, generationLimit: 3,
    monthlyGenerationsUsed: monthlyGenerations,
    totalGenerationsUsed: totalGenerations,
  };
}

function getMonthlyWindowStart(user: any): Date {
  const now = new Date();
  if ((user.subscriptionStatus === "active" || user.subscriptionStatus === "trial") && user.trialStartDate) {
    const subStart = new Date(user.trialStartDate);
    const msIn30Days = 30 * 24 * 60 * 60 * 1000;
    const msSinceStart = now.getTime() - subStart.getTime();
    const cycleNumber = Math.floor(msSinceStart / msIn30Days);
    return new Date(subStart.getTime() + cycleNumber * msIn30Days);
  }
  return new Date(now.getFullYear(), now.getMonth(), 1);
}

router.get("/subscription/status", requireAuth, async (req: any, res): Promise<void> => {
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
    trialEndsAt: user.trialEndsAt?.toISOString() ?? null,
    planExpiry: user.planExpiry?.toISOString() ?? null,
    subscriptionStatus: user.subscriptionStatus,
    razorpaySubscriptionId: user.razorpaySubscriptionId,
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

router.post("/subscription/create", requireAuth, async (req: any, res): Promise<void> => {
  const { planType, couponCode } = req.body as {
    planType?: "starter" | "creator" | "infinity";
    couponCode?: string;
  };
  
  if (!planType) {
    res.status(400).json({ error: "planType is required" });
    return;
  }

  const effectivePlan = (planType === "infinity" ? "infinity" : planType === "creator" ? "creator" : "starter") as "starter" | "creator" | "infinity";

  
  try {
    const user = await getOrCreateUser(req.userId);
    const auth = getAuth(req);

    // Ensure we trigger the secure .env mapped Razorpay Subscription Engine
    const subscription = await createSubscription(req.userId, effectivePlan.toUpperCase(), user.email || undefined);

    const trialEndsAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await db.update(usersTable)
      .set({
        razorpaySubscriptionId: subscription.id,
        subscriptionStatus: "pending", 
        planType: effectivePlan,
      })
      .where(eq(usersTable.id, req.userId));

    res.json({
      subscriptionId: subscription.id,
      keyId: process.env.RAZORPAY_LIVE_KEY_ID || process.env.RAZORPAY_KEY_ID,
      planName: `GrowFlow AI ${effectivePlan.toUpperCase()}`,
      planType: effectivePlan,
      billingPeriod: "monthly",
      amount: planType === "infinity" ? 49900 : planType === "creator" ? 24900 : 10900,
      currency: "INR",
      trialEndsAt: trialEndsAt.toISOString(),
      ghostMode: false
    });
  } catch (err: any) {
    console.error("Subscription create error:", err);
    res.status(500).json({ error: err?.message || "Failed to create subscription" });
  }
});

router.post("/subscription/verify", requireAuth, async (req: any, res): Promise<void> => {
  const { razorpay_payment_id, razorpay_subscription_id, razorpay_signature, planType } = req.body;

  if (!razorpay_payment_id || !razorpay_subscription_id || !razorpay_signature) {
    res.status(400).json({ error: "Missing payment verification data" });
    return;
  }

  const keySecret = process.env.RAZORPAY_KEY_SECRET;
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

  await db.update(usersTable)
    .set({ subscriptionStatus: "trial", planType: effectivePlan })
    .where(eq(usersTable.id, req.userId));

  grantReferralReward(req.userId).catch(err => console.error("grantReferralReward error:", err));

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.userId));
  if (user && user.email) {
    import("../../lib/WelcomeSequence").then(seq => {
      seq.WelcomeSequence.sendPaymentSuccess(
        user.email as string, 
        "", 
        effectivePlan, 
        "7 Days Limit-Free Trial", 
        "₹0"
      );
    }).catch(err => console.error("Payment email dynamic import failed:", err));
  }

  res.json({
    success: true,
    planType: effectivePlan,
    message: `${effectivePlan === "infinity" ? "Infinity" : effectivePlan === "creator" ? "Creator" : "Starter"} subscription activated. 7-day free trial started!`,
  });
});

router.post("/subscription/cancel", requireAuth, async (req: any, res): Promise<void> => {
  const razorpay = getRazorpay();
  const user = await getOrCreateUser(req.userId);

  if (razorpay && user.razorpaySubscriptionId) {
    try {
      await razorpay.subscriptions.cancel(user.razorpaySubscriptionId, { cancel_at_cycle_end: 1 });
    } catch (e) {
      console.error("Razorpay cancel error:", e);
    }
  }

  await db.update(usersTable)
    .set({ subscriptionStatus: "canceled", planType: "free" })
    .where(eq(usersTable.id, req.userId));

  res.json({ success: true, message: "Subscription cancelled" });
});

router.post("/subscription/retry", requireAuth, async (req: any, res): Promise<void> => {
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

  await db.update(usersTable)
    .set({
      subscriptionStatus: "free",
      razorpaySubscriptionId: null,
    })
    .where(eq(usersTable.id, req.userId));

  res.json({ success: true, planType: previousPlan });
});

router.get("/subscription/validate-coupon", requireAuth, async (req: any, res): Promise<void> => {
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

router.get("/trial/status", requireAuth, async (req: any, res): Promise<void> => {
  try {
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.userId));
    if (!user) {
      res.json({ ideas: 0, strategy: 0, hooks: 0, limit: FREE_TRIALS_PER_TOOL, isPaid: false });
      return;
    }
    const toolTrials = (user.toolTrials as Record<string, number>) ?? {};
    res.json({
      ideas: toolTrials["ideas"] ?? 0,
      strategy: toolTrials["strategy"] ?? 0,
      hooks: toolTrials["hooks"] ?? 0,
      limit: FREE_TRIALS_PER_TOOL,
      isPaid: isPaidOrTrial(user),
    });
  } catch {
    res.status(500).json({ error: "Failed to fetch trial status." });
  }
});

router.post("/trial/use", requireAuth, async (req: any, res): Promise<void> => {
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
    res.json({ used: newCount, limit: FREE_TRIALS_PER_TOOL, isPaid: false });
  } catch {
    res.status(500).json({ error: "Failed to record trial usage." });
  }
});

router.post("/user/login", requireAuth, async (req: any, res): Promise<void> => {
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

router.post("/subscription/webhook", async (req: any, res): Promise<void> => {
  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (webhookSecret) {
    const signature = req.headers["x-razorpay-signature"];
    const expectedSig = crypto
      .createHmac("sha256", webhookSecret)
      .update(JSON.stringify(req.body))
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
    "subscription.halted": "past_due",
    "subscription.cancelled": "canceled",
    "subscription.expired": "canceled",
  };

  const newStatus = statusMap[event.event];
  if (newStatus) {
    const updates: any = { subscriptionStatus: newStatus };
    if (newStatus === "canceled") updates.planType = "free";
    const updatedUsers = await db.update(usersTable)
      .set(updates)
      .where(eq(usersTable.razorpaySubscriptionId, subscriptionId))
      .returning({ id: usersTable.id });

    if (event.event === "subscription.charged" && updatedUsers.length > 0) {
      for (const u of updatedUsers) {
        grantReferralReward(u.id).catch(err => console.error("grantReferralReward webhook error:", err));
      }
    }
  }

  res.json({ received: true });
});

export default router;
