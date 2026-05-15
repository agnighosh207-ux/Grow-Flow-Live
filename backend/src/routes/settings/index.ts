import { Router, type IRouter } from "express";
import { getAuth } from "@clerk/express";
import { db, usersTable, contentGenerationsTable, supportMessagesTable, referralsTable, paymentsTable, contentCalendarTable, favoritesTable, usageLogsTable, dailyPlansTable, featureUsageLogsTable, securityLogsTable, impersonationSessionsTable } from "@workspace/db";
import { eq, count, and, sql } from "drizzle-orm";

const router: IRouter = Router();

import { requireAuth } from "../../middlewares/planMiddleware";

router.get("/test", (req, res) => res.json({ ok: true }));

router.get("/", requireAuth, async (req: any, res): Promise<void> => {
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.userId));

  res.json({
    notifications: {
      emailNotifications: user?.emailNotifications ?? true,
      productUpdates: user?.productUpdates ?? true,
      weeklyDigest: user?.weeklyDigest ?? true,
      marketingEmails: user?.marketingEmails ?? false,
      emailReports: user?.emailReports ?? true,
      streakReminders: user?.streakReminders ?? true,
    },
    profile: {
      username: user?.username ?? "",
      displayName: user?.displayName ?? "",
      showOnLeaderboard: user?.showOnLeaderboard ?? false,
      avatarUrl: user?.avatarUrl ?? "",
    },
    account: {
      scheduledDeletionAt: user?.scheduledDeletionAt ?? null,
    }
  });
});

router.get("/check-username", requireAuth, async (req: any, res) => {
  const { username } = req.query;
  if (!username || typeof username !== 'string') {
    res.status(400).json({ error: "Username required" });
    return;
  }
  const sanitized = username.toLowerCase().replace(/[^a-z0-9_]/g, '');
  if (sanitized.length < 3) {
    res.json({ available: false, reason: "Too short" });
    return;
  }
  const [existing] = await db.select({ id: usersTable.id })
    .from(usersTable)
    .where(and(eq(usersTable.username, sanitized), sql`${usersTable.id} != ${req.userId}`));
  res.json({ available: !existing, sanitized });
});

router.patch("/notifications", requireAuth, async (req: any, res): Promise<void> => {
  const { emailNotifications, productUpdates, weeklyDigest, marketingEmails, emailReports, streakReminders } = req.body;

  const updates: any = {};
  if (typeof emailNotifications === "boolean") updates.emailNotifications = emailNotifications;
  if (typeof productUpdates === "boolean") updates.productUpdates = productUpdates;
  if (typeof weeklyDigest === "boolean") updates.weeklyDigest = weeklyDigest;
  if (typeof marketingEmails === "boolean") updates.marketingEmails = marketingEmails;
  if (typeof emailReports === "boolean") updates.emailReports = emailReports;
  if (typeof streakReminders === "boolean") updates.streakReminders = streakReminders;

  await db
    .update(usersTable)
    .set(updates)
    .where(eq(usersTable.id, req.userId));

  res.json({ success: true });
});

router.patch("/profile", requireAuth, async (req: any, res): Promise<void> => {
  const { username, displayName, showOnLeaderboard, avatarUrl } = req.body;
  const updates: any = {};

  if (typeof username === "string") updates.username = username.toLowerCase().replace(/[^a-z0-9_]/g, "");
  if (typeof displayName === "string") updates.displayName = displayName;
  if (typeof showOnLeaderboard === "boolean") updates.showOnLeaderboard = showOnLeaderboard;
  if (typeof avatarUrl === "string") updates.avatarUrl = avatarUrl;

  if (updates.username) {
    if (updates.username.length < 3) {
        res.status(400).json({ error: "Username too short" });
        return;
    }
    const [existing] = await db.select().from(usersTable)
      .where(and(eq(usersTable.username, updates.username), sql`id != ${req.userId}`));
    if (existing) {
      res.status(400).json({ error: "Username already taken" });
      return;
    }
  }

  if (Object.keys(updates).length > 0) {
    await db.update(usersTable).set(updates).where(eq(usersTable.id, req.userId));
  }
  res.json({ success: true });
});

router.delete("/account", requireAuth, async (req: any, res): Promise<void> => {
  try {
    const userId = req.userId;
    const deletionDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await db.update(usersTable)
      .set({ 
        scheduledDeletionAt: deletionDate,
        subscriptionStatus: "canceled"
      } as any)
      .where(eq(usersTable.id, userId));

    // Here we would ideally trigger an email, but for now we just return success
    res.json({ 
      success: true, 
      message: "Account scheduled for deletion in 7 days.",
      scheduledDeletionAt: deletionDate 
    });
  } catch (err: any) {
    console.error("Account deletion error:", err);
    res.status(500).json({ error: "Failed to schedule account deletion." });
  }
});

router.post("/cancel-deletion", requireAuth, async (req: any, res) => {
  await db.update(usersTable)
    .set({ scheduledDeletionAt: null } as any)
    .where(eq(usersTable.id, req.userId));
  res.json({ success: true, message: "Account deletion cancelled." });
});

router.get("/export", requireAuth, async (req: any, res) => {
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.userId));
  const generations = await db.select().from(contentGenerationsTable).where(eq(contentGenerationsTable.userId, req.userId));
  const savedItems = await db.select().from(favoritesTable).where(eq(favoritesTable.userId, req.userId));
  
  const { razorpaySubscriptionId, razorpayCustomerId, isAdmin, ...safeUser } = user as any;
  
  res.json({
    exportDate: new Date().toISOString(),
    account: safeUser,
    contentGenerations: generations,
    savedItems: savedItems,
  });
});

router.get("/preferences", requireAuth, async (req: any, res) => {
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.userId));
  res.json({
    languagePreference: user?.languagePreference || "en",
    emailReports: user?.emailReports ?? true
  });
});

router.patch("/preferences", requireAuth, async (req: any, res) => {
  const { languagePreference, emailReports } = req.body;
  const updates: any = {};
  if (typeof languagePreference === "string") updates.languagePreference = languagePreference;
  if (typeof emailReports === "boolean") updates.emailReports = emailReports;

  if (Object.keys(updates).length > 0) {
    await db.update(usersTable).set(updates).where(eq(usersTable.id, req.userId));
  }
  res.json({ success: true });
});

export default router;
