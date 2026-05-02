/**
 * Razorpay Plan ID Router
 * Strictly maps tier and billing cycle combinations to environment-configured Plan IDs.
 */

export type PlanTier = 'starter' | 'creator' | 'infinity';
export type BillingCycle = 'monthly' | 'quarterly' | 'half-yearly' | 'yearly';

/**
 * Resolves the correct Razorpay Plan ID from environment variables.
 * @param tier - The subscription tier (starter, creator, infinity)
 * @param cycle - The billing cycle (monthly, quarterly, half-yearly, yearly)
 * @throws Error if the combination is invalid or environment variable is missing
 */
export function getRazorpayPlanId(tier: string, cycle: string, currency: string = "INR"): string {
  const normalizedTier = tier.toLowerCase() as PlanTier;
  const normalizedCycle = cycle.toLowerCase().replace(' ', '') as BillingCycle;
  const normalizedCurrency = currency.toUpperCase();

  const validTiers: PlanTier[] = ['starter', 'creator', 'infinity'];
  const validCycles: BillingCycle[] = ['monthly', 'quarterly', 'half-yearly', 'yearly'];

  if (!validTiers.includes(normalizedTier)) {
    throw new Error(`INVALID_PLAN_TIER: The tier "${tier}" is not supported.`);
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
    console.error(`[CRITICAL] Missing Razorpay Plan ID for key: ${envKey}`);
    throw new Error(`PLAN_NOT_CONFIGURED: Subscriptions for ${tier} (${cycle}) in ${normalizedCurrency} are temporarily unavailable.`);
  }

  return planId;
}
