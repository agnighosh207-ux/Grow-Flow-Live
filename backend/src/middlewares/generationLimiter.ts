import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";

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
      planType: usersTable.planType,
      subscriptionStatus: usersTable.subscriptionStatus,
    }).from(usersTable).where(eq(usersTable.id, req.userId));

    if (!user) {
      return res.status(401).json({ error: "User not found" });
    }

    // Bypass if active Pro (Infinity) which is unlimited in our plan rules
    if (user.subscriptionStatus === 'active' && user.planType === 'infinity') {
        return next();
    }

    if (user.generationsRemaining <= 0) {
      return res.status(402).json({
        error: "payment_required",
        message: "You have run out of generations. Please upgrade to continue.",
        code: "ZERO_GENERATIONS"
      });
    }

    next();
  } catch (error: any) {
    console.error("Enforce limit DB error (bypassing for robustness):", error?.message);
    // Graceful degradation: if the DB is down or connection string is invalid,
    // allow the generation to proceed so the app doesn't completely break for users.
    next();
  }
};
