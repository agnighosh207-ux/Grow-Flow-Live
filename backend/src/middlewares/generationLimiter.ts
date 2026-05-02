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

  try {
    const [user] = await db.select({
      id: usersTable.id,
      generationsRemaining: usersTable.generationsRemaining,
      planTier: usersTable.planTier,
      subscriptionStatus: usersTable.subscriptionStatus,
    }).from(usersTable).where(eq(usersTable.id, req.userId));

    if (!user) {
      return res.status(401).json({ error: "User not found" });
    }

    // Bypass if active Pro (Infinity) which is unlimited in our plan rules
    if (user.subscriptionStatus === 'active' && user.planTier === 'INFINITY') {
        return next();
    }

    if (user.generationsRemaining <= 0) {
      return res.status(402).json({
        error: "payment_required",
        message: "You have run out of generations. Please upgrade to continue.",
        code: "ZERO_GENERATIONS"
      });
    }

    // Atomic Decrement to prevent race conditions (Flaw 4)
    const result = await db.update(usersTable)
      .set({ 
        generationsRemaining: sql`GREATEST(0, ${usersTable.generationsRemaining} - 1)`,
        totalGenerations: sql`${usersTable.totalGenerations} + 1`
      })
      .where(and(
        eq(usersTable.id, req.userId),
        gt(usersTable.generationsRemaining, 0)
      ))
      .returning({ id: usersTable.id });

    if (result.length === 0) {
      return res.status(402).json({
        error: "payment_required",
        message: "You have run out of generations. Please upgrade to continue.",
        code: "ZERO_GENERATIONS"
      });
    }

    next();
  } catch (error: any) {
    logger.error({ error: error?.message }, "Enforce limit DB error");
    return res.status(500).json({ error: "Internal server error while verifying generations" });
  }
};
