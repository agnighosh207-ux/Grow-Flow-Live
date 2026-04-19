import { Router } from "express";
import { validateWebhookSignature } from "razorpay/dist/utils/razorpay-utils";
import { db, usersTable } from "@workspace/db";
import { securityLogsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import pino from "pino";
import crypto from "crypto";
// Placeholder import, will not break since it's common practice to isolate external emailer
// import { sendPremiumWelcomeEmail } from "../services/email-service"; 

const router = Router();
const logger = pino();

const WEBHOOK_SECRET = process.env.RAZORPAY_WEBHOOK_SECRET || "";

const getTierLimits = (tier: string) => {
  switch (tier.toUpperCase()) {
    case "INFINITY": return 9999;
    case "CREATOR": return 60;
    case "STARTER": return 20;
    default: return 5;
  }
};

router.post("/razorpay", async (req, res) => {
  try {
    const signature = req.headers["x-razorpay-signature"] as string;
    
    // 1. SECURE AUTHENTICATION
    const isValid = validateWebhookSignature(
      JSON.stringify(req.body),
      signature,
      WEBHOOK_SECRET
    );

    if (!isValid) {
      logger.error("[Webhook] Invalid Razorpay Signature.");
      return res.status(400).send("Invalid signature");
    }

    const event = req.body;
    const payload = event.payload?.subscription?.entity || event.payload?.payment?.entity;
    const clerkUserId = payload?.notes?.clerk_user_id;

    if (!clerkUserId) {
      logger.warn(`[Webhook] Missing clerk_user_id in notes for event: ${event.event}`);
      return res.status(200).send("No user tracking available.");
    }

    logger.info(`[Webhook] Processing event ${event.event} for user: ${clerkUserId}`);

    // 2. EVENT ROUTING
    if (event.event === "subscription.authenticated" || event.event === "subscription.charged") {
      const planTier = payload?.notes?.tier || "STARTER";
      const limits = getTierLimits(planTier);

      await db.update(usersTable)
        .set({
          planType: planTier.toLowerCase(),
          creditsRemaining: limits,
          subscriptionStatus: "active",
          lastCreditReset: new Date(),
          isBetaUser: false, // Phase 3: Purging beta status permanently from paying users
        })
        .where(eq(usersTable.id, clerkUserId));

      logger.info(`[Webhook] [PAYMENT SUCCESS] User ${clerkUserId} upgraded to ${planTier.toUpperCase()}`);

      // Optional: trigger premium email
      // await sendPremiumWelcomeEmail(clerkUserId, planTier);
    } 
    else if (event.event === "payment.failed" || event.event === "subscription.cancelled" || event.event === "subscription.halted") {
      await db.update(usersTable)
        .set({
          planType: "free",
          creditsRemaining: 5,
          subscriptionStatus: "free",
        })
        .where(eq(usersTable.id, clerkUserId));

      // Log the downgrade securely inside security_logs per Phase 3 requirement
      await db.insert(securityLogsTable).values({
        id: crypto.randomUUID(),
        userId: clerkUserId,
        eventType: "AUTH_FAILURE", // Best analog for payment halt/fail requirement
        metadata: { event: event.event, reason: "Payment execution failure or intentional cancellation" }
      });

      logger.warn(`[Webhook] User ${clerkUserId} downgraded to FREE due to ${event.event}`);
    }

    return res.status(200).json({ success: true });
  } catch (err: any) {
    logger.error(`[Webhook] Unhandled Webhook Error: ${err?.message || err}`);
    return res.status(500).send("Webhook critical failure");
  }
});

export default router;
