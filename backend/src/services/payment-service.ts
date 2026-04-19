import Razorpay from "razorpay";
import pino from "pino";

const logger = pino();

export const razorpay = new Razorpay({
  key_id: (process.env.RAZORPAY_LIVE_KEY_ID || process.env.RAZORPAY_KEY_ID) as string,
  key_secret: (process.env.RAZORPAY_LIVE_KEY_SECRET || process.env.RAZORPAY_KEY_SECRET) as string,
});

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

export const createSubscription = async (userId: string, planTier: string, customerEmail?: string) => {
  try {
    const planId = RAZORPAY_PLAN_MAP[planTier];
    if (!planId) {
      throw new Error(`Plan ID mapping not found for tier: ${planTier}`);
    }

    const options = {
      plan_id: planId,
      customer_notify: 1,
      total_count: 120, // Example: 10 year theoretical maximum cycles
      notes: {
        clerk_user_id: userId,
        tier: planTier,
      },
    };

    const subscription = await razorpay.subscriptions.create(options as any);
    logger.info(`[Razorpay Service] Subscription ${(subscription as any).id} created for user ${userId}`);
    
    return subscription as any;
  } catch (error: any) {
    logger.error(`[Razorpay Service] Engine Failed: ${error?.message || error}`);
    throw error;
  }
};
