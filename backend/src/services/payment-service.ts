import Razorpay from "razorpay";
import { logger } from "../lib/logger";

function getRazorpayClient() {
  const isProd = process.env.NODE_ENV === "production" && process.env.APP_STATUS !== "BETA";
  const keyId = isProd 
    ? (process.env.RAZORPAY_LIVE_KEY_ID || process.env.RAZORPAY_KEY_ID)
    : (process.env.RAZORPAY_TEST_KEY_ID && !process.env.RAZORPAY_TEST_KEY_ID.includes("...") ? process.env.RAZORPAY_TEST_KEY_ID : (process.env.RAZORPAY_LIVE_KEY_ID || process.env.RAZORPAY_KEY_ID));
  
  const keySecret = isProd
    ? (process.env.RAZORPAY_LIVE_KEY_SECRET || process.env.RAZORPAY_KEY_SECRET)
    : (process.env.RAZORPAY_TEST_KEY_SECRET && !process.env.RAZORPAY_TEST_KEY_SECRET.includes("...") ? process.env.RAZORPAY_TEST_KEY_SECRET : (process.env.RAZORPAY_LIVE_KEY_SECRET || process.env.RAZORPAY_KEY_SECRET));

  if (!keyId || !keySecret || keyId.includes("...") || keySecret.includes("...")) {
     throw new Error("Razorpay API keys are missing or invalid in environment.");
  }

  return new Razorpay({ key_id: keyId as string, key_secret: keySecret as string });
}




export const createSubscription = async (userId: string, planId: string, planTier: string, customerEmail?: string, totalCount?: number) => {
  try {
    const options = {
      plan_id: planId,
      customer_notify: 1,
      total_count: totalCount ?? 120,
      notes: {
        clerk_user_id: userId,
        tier: planTier,
      },
    };

    console.log(`[Razorpay Service] Creating subscription for user ${userId} with plan ${planId}...`);
    const client = getRazorpayClient();
    const startTime = Date.now();
    const subscription = await client.subscriptions.create(options as any);
    const duration = Date.now() - startTime;
    
    logger.info(`[Razorpay Service] Subscription ${(subscription as any).id} created successfully in ${duration}ms`);
    console.log(`[Razorpay Service] Subscription ${(subscription as any).id} created for user ${userId}`);
    
    return subscription as any;
  } catch (error: any) {
    const errorMsg = error?.error?.description || error?.message || error;
    logger.error(`[Razorpay Service] Engine Failed: ${errorMsg}`);
    console.error(`[Razorpay Service] FAILED:`, errorMsg);
    throw error;
  }
};
