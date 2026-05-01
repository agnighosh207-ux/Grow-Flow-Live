import Razorpay from "razorpay";
import pino from "pino";

const logger = pino();

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


/**
 * Maps GrowFlow AI tiers mapping dynamically to Razorpay Plan IDs.
 * Note: You must create these plans dynamically in the Razorpay Dashboard first.
 * For example:
 * - STARTER_PLAN: ₹10900 (paise)
 * - CREATOR_PLAN: ₹24900 (paise)
 * - INFINITY_PLAN: ₹49900 (paise)
 */
const RAZORPAY_PLAN_MAP: Record<string, string> = {
  STARTER: process.env.RAZORPAY_PLAN_STARTER || "plan_xyz_starter",
  CREATOR: process.env.RAZORPAY_PLAN_CREATOR || "plan_xyz_creator",
  INFINITY: process.env.RAZORPAY_PLAN_INFINITY || "plan_xyz_infinity",
};

export const createSubscription = async (userId: string, planTier: string, customerEmail?: string, totalCount?: number) => {
  try {
    const planId = RAZORPAY_PLAN_MAP[planTier];
    if (!planId) {
      throw new Error(`Plan ID mapping not found for tier: ${planTier}`);
    }

    const options = {
      plan_id: planId,
      customer_notify: 0,
      total_count: totalCount ?? 12, // Accept from config or fallback to 1 year
      notes: {
        clerk_user_id: userId,
        tier: planTier,
      },
    };

    const client = getRazorpayClient();
    const subscription = await client.subscriptions.create(options as any);
    logger.info(`[Razorpay Service] Subscription ${(subscription as any).id} created for user ${userId}`);
    
    return subscription as any;
  } catch (error: any) {
    logger.error(`[Razorpay Service] Engine Failed: ${error?.message || error}`);
    throw error;
  }
};
