import { db, usersTable } from "@workspace/db";
import { eq, and, gte, sql, gt } from "drizzle-orm";
import { logger } from "../lib/logger";

/**
 * DB-Backed Rate limiter for generations
 */
export const enforceGenerationLimit = async (req: any, res: any, next: any) => {
  if (!req.userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  // --- H-3 OPTIMIZATION: Use pre-attached req.user from authSyncMiddleware ---
  const user = req.user;
  if (!user) {
    // Fallback in case middleware ordering changes, though authSync should always run first
    logger.warn({ path: req.path }, "enforceGenerationLimit: req.user missing, falling back to DB select");
    const [fetched] = await db.select().from(usersTable).where(eq(usersTable.id, req.userId));
    if (!fetched) return res.status(401).json({ error: "User not found" });
    req.user = fetched;
  }

  // 1. Bypass check (Atomic check not required for bypass flags)
  if (req.user.isAdmin || (req.user.subscriptionStatus === 'active' && req.user.planTier === 'INFINITY')) {
    return next();
  }

  try {
    // 2. Atomic decrement using conditional UPDATE
    // This eliminates the need for a SELECT ... FOR UPDATE transaction block.
    const [updated] = await db.update(usersTable)
      .set({
        generationsRemaining: sql`GREATEST(0, ${usersTable.generationsRemaining} - 1)`,
        totalGenerations: sql`${usersTable.totalGenerations} + 1`
      })
      .where(and(
        eq(usersTable.id, req.userId),
        gt(usersTable.generationsRemaining, 0)
      ))
      .returning({ generationsRemaining: usersTable.generationsRemaining });

    if (!updated) {
      // If no rows were updated, the condition (generationsRemaining > 0) failed
      return res.status(402).json({
        error: "payment_required",
        message: "You have run out of generations. Please upgrade to continue.",
        code: "ZERO_GENERATIONS"
      });
    }

    // 3. Keep req.user in sync for the current request context
    req.user.generationsRemaining = updated.generationsRemaining;

    next();
  } catch (error: any) {
    logger.error({ error: error?.message, uid: req.userId }, "Enforce limit atomic update error");
    return res.status(500).json({ error: "Internal server error while verifying generations" });
  }
};

/**
 * Refund a credit if the generation fails (e.g. AI timeout, malformed JSON)
 * Call this in the catch block of routes that use enforceGenerationLimit.
 */
export const refundGenerationCredit = async (userId: string, userPlanTier?: string) => {
  if (userPlanTier === 'INFINITY') return; // Infinity doesn't use credits
  
  try {
    await db.update(usersTable)
      .set({
        generationsRemaining: sql`${usersTable.generationsRemaining} + 1`,
        totalGenerations: sql`GREATEST(0, ${usersTable.totalGenerations} - 1)`
      })
      .where(eq(usersTable.id, userId));
  } catch (err) {
    logger.error({ uid: userId, err: String(err) }, "Failed to refund generation credit");
  }
};
