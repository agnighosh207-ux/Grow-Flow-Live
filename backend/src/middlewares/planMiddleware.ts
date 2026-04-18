import { getAuth } from "@clerk/express";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";

export const FREE_TRIALS_PER_TOOL = 3000;

export const requireAuth = (req: any, res: any, next: any) => {
  const auth = getAuth(req);
  const userId = auth?.sessionClaims?.userId || auth?.userId;
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  req.userId = userId;
  next();
};

export async function getOrCreateUser(userId: string, email?: string) {
  let [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
  if (!user) {
    [user] = await db.insert(usersTable)
      .values({ id: userId, email: email ?? null, lastLoginAt: new Date() })
      .returning();
  }
  return user;
}

export function isPaidOrTrial(user: any): boolean {
  const status = user?.subscriptionStatus ?? "free";
  if (status === "active") return true;
  if (status === "trial" && user?.trialEndsAt && new Date(user.trialEndsAt) > new Date()) return true;
  return false;
}

export function requirePlanOrTrial(toolKey: string) {
  return async (req: any, res: any, next: any) => {
    try {
      const user = await getOrCreateUser(req.userId);
      req.user = user;

      if (isPaidOrTrial(user)) return next();

      const toolTrials = (user.toolTrials as Record<string, number>) ?? {};
      const used = toolTrials[toolKey] ?? 0;

      if (used < FREE_TRIALS_PER_TOOL) {
        req.trialMode = true;
        return next();
      }

      res.status(402).json({
        error: "upgrade_required",
        message: "You've used all free trials for this tool. Upgrade to continue.",
        toolKey,
        trialsUsed: used,
        trialsLimit: FREE_TRIALS_PER_TOOL,
      });
    } catch {
      res.status(500).json({ error: "Something went wrong. Please try again." });
    }
  };
}

export async function consumeToolTrial(userId: string, toolKey: string): Promise<number> {
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
  if (!user) return 0;
  if (isPaidOrTrial(user)) return FREE_TRIALS_PER_TOOL;

  const current = (user.toolTrials as Record<string, number>) ?? {};
  const newCount = Math.min((current[toolKey] ?? 0) + 1, FREE_TRIALS_PER_TOOL);
  const updated = { ...current, [toolKey]: newCount };

  await db.update(usersTable)
    .set({ toolTrials: updated })
    .where(eq(usersTable.id, userId));

  return newCount;
}
