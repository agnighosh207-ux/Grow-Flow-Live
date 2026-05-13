import Razorpay from "razorpay";
import { logger } from "../lib/logger";

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
     logger.error("[Razorpay Service] CRITICAL: Missing or invalid API keys");
     throw new Error("Razorpay configuration is incomplete. Please check environment variables.");
  }

  return new Razorpay({ key_id: keyId, key_secret: keySecret });
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

    logger.info(`[Razorpay Service] Creating subscription for user ${userId} with plan ${planId}...`);
    const client = getRazorpayClient();
    const startTime = Date.now();
    const subscription = await client.subscriptions.create(options as any);
    const duration = Date.now() - startTime;
    
    logger.info(`[Razorpay Service] Subscription ${(subscription as any).id} created successfully in ${duration}ms`);
    logger.info(`[Razorpay Service] Subscription ${(subscription as any).id} created for user ${userId}`);
    
    return subscription as any;
  } catch (error: any) {
    const errorMsg = error?.error?.description || error?.message || error;
    logger.error({ error: errorMsg, userId }, `[Razorpay Service] Engine Failed`);
    throw error;
  }
};
