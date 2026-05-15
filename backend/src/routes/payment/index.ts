import { Router } from "express";
import crypto from "crypto";
import Razorpay from "razorpay";
import { requireAuth } from "../../middlewares/planMiddleware";
import { AuthenticatedRequest } from "../../types";
import { Response } from "express";
import { logger } from "../../lib/logger";
import { db, paymentsTable } from "@workspace/db";

const router = Router();

function getRazorpayClient() {
  const appStatus = process.env.APP_STATUS || "";
  const isProd = 
    process.env.NODE_ENV === "production" || 
    appStatus === "PRODUCTION" || 
    appStatus === "BETA" ||
    !!process.env.RAILWAY_ENVIRONMENT;

  const keyId = isProd 
    ? (process.env.RAZORPAY_LIVE_KEY_ID || process.env.RAZORPAY_KEY_ID)
    : (process.env.RAZORPAY_TEST_KEY_ID && !process.env.RAZORPAY_TEST_KEY_ID.includes("...") 
        ? process.env.RAZORPAY_TEST_KEY_ID 
        : (process.env.RAZORPAY_LIVE_KEY_ID || process.env.RAZORPAY_KEY_ID));
  
  const keySecret = isProd
    ? (process.env.RAZORPAY_LIVE_KEY_SECRET || process.env.RAZORPAY_KEY_SECRET)
    : (process.env.RAZORPAY_TEST_KEY_SECRET && !process.env.RAZORPAY_TEST_KEY_SECRET.includes("...") 
        ? process.env.RAZORPAY_TEST_KEY_SECRET 
        : (process.env.RAZORPAY_LIVE_KEY_SECRET || process.env.RAZORPAY_KEY_SECRET));

  if (!keyId || !keySecret || keyId.includes("...") || keySecret.includes("...")) {
    throw new Error("Razorpay keys not configured or contain placeholders. Check environment variables.");
  }

  return new Razorpay({ key_id: keyId, key_secret: keySecret });
}

router.post("/tip/create", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { amount } = req.body; // 4900 or 9900
    if (![4900, 9900].includes(amount)) {
      res.status(400).json({ error: "Invalid tip amount" });
      return;
    }

    let client;
    try {
      client = getRazorpayClient();
    } catch (e: any) {
      res.status(503).json({ error: "PAYMENT_CONFIG_ERROR", message: e.message });
      return;
    }

    const order = await client.orders.create({
      amount,
      currency: "INR",
      receipt: crypto.randomUUID(),
      notes: {
        userId: req.userId,
        type: "TIP"
      }
    });

    res.json(order);
  } catch (err: any) {
    logger.error({ err }, "Tip creation error");
    res.status(500).json({ error: "Failed to create tip order" });
  }
});

router.post("/tip/verify", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const razorpay_order_id = typeof req.body.razorpay_order_id === "string" ? req.body.razorpay_order_id : "";
    const razorpay_payment_id = typeof req.body.razorpay_payment_id === "string" ? req.body.razorpay_payment_id : "";
    const razorpay_signature = typeof req.body.razorpay_signature === "string" ? req.body.razorpay_signature : "";
    
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

    const expectedSig = crypto
      .createHmac("sha256", keySecret!)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest("hex");

    if (!razorpay_signature || !expectedSig || razorpay_signature.length !== expectedSig.length || !crypto.timingSafeEqual(Buffer.from(razorpay_signature), Buffer.from(expectedSig))) {
      res.status(400).json({ error: "Invalid payment signature" });
      return;
    }

    // --- FIX: Record the payment in the database ---
    await db.insert(paymentsTable).values({
      id: razorpay_payment_id,
      userId: req.userId,
      orderId: razorpay_order_id,
      amount: req.body.amount || 0,
      status: "captured",
      method: "razorpay_tip",
      processedAt: new Date(),
      metadata: { type: "TIP", ...req.body }
    }).onConflictDoUpdate({
      target: [paymentsTable.id],
      set: { status: "captured", processedAt: new Date() }
    });

    res.json({ success: true });
  } catch (err: any) {
    logger.error({ err }, "Tip verification error");
    res.status(500).json({ error: "Failed to verify tip" });
  }
});

export default router;
