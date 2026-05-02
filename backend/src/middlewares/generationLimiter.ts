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
    const result = await db.transaction(async (tx) => {
      // Lock the user row for exclusive access during this transaction
      const [user] = await tx.select().from(usersTable)
        .where(eq(usersTable.id, req.userId))
        .for('update'); 

      if (!user) {
        throw new Error("USER_NOT_FOUND");
      }

      // Bypass if active Pro (Infinity)
      if (user.subscriptionStatus === 'active' && user.planTier === 'INFINITY') {
        return "BYPASS";
      }

      if (user.generationsRemaining <= 0) {
        throw new Error("NO_GENERATIONS");
      }

      const updated = await tx.update(usersTable)
        .set({
          generationsRemaining: sql`GREATEST(0, ${usersTable.generationsRemaining} - 1)`,
          totalGenerations: sql`${usersTable.totalGenerations} + 1`
        })
        .where(eq(usersTable.id, req.userId))
        .returning({ id: usersTable.id });

      return updated[0];
    });

    if (result === "BYPASS") return next();

    next();
  } catch (error: any) {
    if (error.message === "NO_GENERATIONS") {
      return res.status(402).json({
        error: "payment_required",
        message: "You have run out of generations. Please upgrade to continue.",
        code: "ZERO_GENERATIONS"
      });
    }
    if (error.message === "USER_NOT_FOUND") {
      return res.status(401).json({ error: "User not found" });
    }
    logger.error({ error: error?.message }, "Enforce limit DB error");
    return res.status(500).json({ error: "Internal server error while verifying generations" });
  }
};
