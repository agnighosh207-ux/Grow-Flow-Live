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
  const isProd = process.env.NODE_ENV === "production" && process.env.APP_STATUS !== "BETA";
  const keyId = isProd 
    ? (process.env.RAZORPAY_LIVE_KEY_ID || process.env.RAZORPAY_KEY_ID)
    : (process.env.RAZORPAY_TEST_KEY_ID || process.env.RAZORPAY_KEY_ID);
  const keySecret = isProd
    ? (process.env.RAZORPAY_LIVE_KEY_SECRET || process.env.RAZORPAY_KEY_SECRET)
    : (process.env.RAZORPAY_TEST_KEY_SECRET || process.env.RAZORPAY_KEY_SECRET);
  return new Razorpay({ key_id: keyId as string, key_secret: keySecret as string });
}

router.post("/payment/tip/create", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { amount } = req.body; // 4900 or 9900
    if (![4900, 9900].includes(amount)) {
      res.status(400).json({ error: "Invalid tip amount" });
      return;
    }

    const client = getRazorpayClient();
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

router.post("/payment/tip/verify", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
    
    const isProd = process.env.NODE_ENV === "production" && process.env.APP_STATUS !== "BETA";
    const keySecret = isProd
      ? (process.env.RAZORPAY_LIVE_KEY_SECRET || process.env.RAZORPAY_KEY_SECRET)
      : (process.env.RAZORPAY_TEST_KEY_SECRET || process.env.RAZORPAY_KEY_SECRET);

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
