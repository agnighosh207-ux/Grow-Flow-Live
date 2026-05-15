import { logger } from "../lib/logger";

/**
 * Razorpay Plan ID Router
 * Strictly maps tier and billing cycle combinations to environment-configured Plan IDs.
 */

export type PlanTier = 'starter' | 'creator' | 'infinity' | 'agency';
export type BillingCycle = 'monthly' | 'quarterly' | 'half-yearly' | 'yearly';

/**
 * REQUIRED RAZORPAY PLAN IDs — Create these in Razorpay Dashboard > Products > Subscriptions > Plans
 * Each plan ID is unique to its price. You MUST create NEW plans for updated prices.
 * Old plan IDs cannot have their price changed.
 *
 * INR PLANS (amounts in paise):
 * RAZORPAY_PLAN_STARTER_MONTHLY      = plan_xxxx  (₹149/mo = 14900 paise, interval: monthly, period: monthly)
 * RAZORPAY_PLAN_STARTER_QUARTERLY    = plan_xxxx  (₹417/quarter = 41700 paise, interval: 3, period: monthly)
 * RAZORPAY_PLAN_STARTER_HALFYEARLY   = plan_xxxx  (₹798/6mo = 79800 paise, interval: 6, period: monthly)
 * RAZORPAY_PLAN_STARTER_YEARLY       = plan_xxxx  (₹1430/yr = 143000 paise, interval: yearly, period: yearly)
 *
 * RAZORPAY_PLAN_CREATOR_MONTHLY      = plan_xxxx  (₹449/mo = 44900 paise)
 * RAZORPAY_PLAN_CREATOR_QUARTERLY    = plan_xxxx  (₹1257/quarter = 125700 paise)
 * RAZORPAY_PLAN_CREATOR_HALFYEARLY   = plan_xxxx  (₹2428/6mo = 242800 paise)
 * RAZORPAY_PLAN_CREATOR_YEARLY       = plan_xxxx  (₹4300/yr = 430000 paise)
 *
 * RAZORPAY_PLAN_INFINITY_MONTHLY     = plan_xxxx  (₹799/mo = 79900 paise)
 * RAZORPAY_PLAN_INFINITY_QUARTERLY   = plan_xxxx  (₹2247/quarter = 224700 paise)
 * RAZORPAY_PLAN_INFINITY_HALFYEARLY  = plan_xxxx  (₹4320/6mo = 432000 paise)
 * RAZORPAY_PLAN_INFINITY_YEARLY      = plan_xxxx  (₹7660/yr = 766000 paise)
 *
 * RAZORPAY_PLAN_AGENCY_MONTHLY       = plan_xxxx  (₹2999/mo = 299900 paise)
 * RAZORPAY_PLAN_AGENCY_YEARLY        = plan_xxxx  (₹28799/yr = 2879900 paise)
 *
 * USD PLANS (amounts in cents):
 * RAZORPAY_PLAN_STARTER_MONTHLY_USD  = plan_xxxx  ($5/mo = 500 cents)
 * RAZORPAY_PLAN_STARTER_YEARLY_USD   = plan_xxxx  ($48/yr = 4800 cents)
 * RAZORPAY_PLAN_CREATOR_MONTHLY_USD  = plan_xxxx  ($15/mo = 1500 cents)
 * RAZORPAY_PLAN_CREATOR_YEARLY_USD   = plan_xxxx  ($144/yr = 14400 cents)
 * RAZORPAY_PLAN_INFINITY_MONTHLY_USD = plan_xxxx  ($27/mo = 2700 cents)
 * RAZORPAY_PLAN_INFINITY_YEARLY_USD  = plan_xxxx  ($259/yr = 25920 cents)
 */

/**
 * Resolves the correct Razorpay Plan ID from environment variables.
 * @param tier - The subscription tier (starter, creator, infinity, agency)
 * @param cycle - The billing cycle (monthly, quarterly, half-yearly, yearly)
 * @throws Error if the combination is invalid or environment variable is missing
 */
export function getRazorpayPlanId(tier: string, cycle: string, currency: string = "INR"): string {
  const normalizedTier = tier.toLowerCase() as PlanTier;
  const normalizedCycle = cycle.toLowerCase().replace(' ', '').replace('-', '') as BillingCycle;
  const normalizedCurrency = currency.toUpperCase();

  const validTiers: PlanTier[] = ['starter', 'creator', 'infinity', 'agency'];
  const validCycles: BillingCycle[] = ['monthly', 'quarterly', 'half-yearly', 'yearly'];

  if (!validTiers.includes(normalizedTier)) {
    throw new Error(`INVALID_PLAN_TIER: The tier "${tier}" is not supported.`);
  }

  if (normalizedTier === 'agency' && !['monthly', 'yearly'].includes(normalizedCycle)) {
    throw new Error(`Agency plan only supports monthly and yearly billing`);
  }

  if (!validCycles.includes(normalizedCycle)) {
    throw new Error(`INVALID_BILLING_CYCLE: The cycle "${cycle}" is not supported.`);
  }


  // Construct the environment variable key name
  // Example: RAZORPAY_PLAN_STARTER_MONTHLY (for INR)
  // Example: RAZORPAY_PLAN_STARTER_MONTHLY_USD (for USD)
  let envKey = `RAZORPAY_PLAN_${normalizedTier.toUpperCase()}_${normalizedCycle.toUpperCase().replace('-', '')}`;
  
  if (normalizedCurrency !== "INR") {
    envKey += `_${normalizedCurrency}`;
  }
  
  const planId = process.env[envKey];

  if (!planId) {
    logger.error({ 
      envKey, 
      tier, 
      cycle,
      availableKeys: Object.keys(process.env).filter(k => k.startsWith('RAZORPAY_PLAN_'))
    }, `[CRITICAL] Missing Razorpay Plan ID`);
    throw new Error(`PLAN_NOT_CONFIGURED: Missing env var "${envKey}". Go to Razorpay Dashboard → Products → Subscriptions → Plans → Create plan → copy ID → add to Railway env vars as ${envKey}`);
  }

  return planId;
}
