import { Router, type IRouter } from "express";
import { getAuth } from "@clerk/express";
import { db, usersTable, contentGenerationsTable, supportMessagesTable, referralsTable, paymentsTable, contentCalendarTable, favoritesTable, usageLogsTable, dailyPlansTable, featureUsageLogsTable, securityLogsTable, impersonationSessionsTable } from "@workspace/db";
import { eq, count, and } from "drizzle-orm";

const router: IRouter = Router();

import { requireAuth } from "../../middlewares/planMiddleware";

router.get("/", requireAuth, async (req: any, res): Promise<void> => {
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.userId));

  res.json({
    notifications: {
      emailNotifications: user?.emailNotifications ?? true,
      productUpdates: user?.productUpdates ?? true,
      weeklyDigest: user?.weeklyDigest ?? true,
      marketingEmails: user?.marketingEmails ?? false,
    },
    profile: {
      username: user?.username ?? "",
      displayName: user?.displayName ?? "",
      showOnLeaderboard: user?.showOnLeaderboard ?? false,
      avatarUrl: user?.avatarUrl ?? "",
    }
  });
});

router.patch("/notifications", requireAuth, async (req: any, res): Promise<void> => {
  const { emailNotifications, productUpdates, weeklyDigest, marketingEmails } = req.body;

  const updates: Record<string, boolean> = {};
  if (typeof emailNotifications === "boolean") updates.emailNotifications = emailNotifications;
  if (typeof productUpdates === "boolean") updates.productUpdates = productUpdates;
  if (typeof weeklyDigest === "boolean") updates.weeklyDigest = weeklyDigest;
  if (typeof marketingEmails === "boolean") updates.marketingEmails = marketingEmails;

  await db
    .update(usersTable)
    .set(updates)
    .where(eq(usersTable.id, req.userId));

  res.json({ success: true });
});

router.get("/preferences", requireAuth, async (req: any, res): Promise<void> => {
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.userId));

  res.json({
    niche: user?.niche ?? null,
    tonePreference: user?.tonePreference ?? null,
    platformPreference: user?.platformPreference ?? null,
    languagePreference: (user as any)?.languagePreference ?? "English",
  });
});

router.patch("/preferences", requireAuth, async (req: any, res): Promise<void> => {
  const { niche, tonePreference, platformPreference, languagePreference } = req.body;

  const updates: Record<string, string | null> = {};
  if (typeof niche === "string" || niche === null) updates.niche = niche || null;
  if (typeof tonePreference === "string" || tonePreference === null) updates.tonePreference = tonePreference || null;
  if (typeof platformPreference === "string" || platformPreference === null) updates.platformPreference = platformPreference || null;
  if (typeof languagePreference === "string" || languagePreference === null) updates.languagePreference = languagePreference || "English";

  if (Object.keys(updates).length > 0) {
    await db
      .update(usersTable)
      .set(updates)
      .where(eq(usersTable.id, req.userId));
  }

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
    const secretKey = process.env.CLERK_SECRET_KEY;

    // --- C-5 FIX: Delete from Clerk FIRST ---
    // This prevents the "silent recovery" bug where Clerk remains but DB is wiped.
    if (secretKey) {
      const response = await fetch(`https://api.clerk.com/v1/users/${userId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${secretKey}` },
      });
      
      if (!response.ok) {
        const errorBody = await response.json().catch(() => ({}));
        console.error("Clerk user deletion failed:", errorBody);
        res.status(502).json({ 
          error: "Identity provider deletion failed", 
          message: "We could not verify account removal with our identity provider. Please try again or contact support." 
        });
        return;
      }
    }

    // Now delete from DB
    await db.transaction(async (tx) => {
      await tx.delete(contentGenerationsTable).where(eq(contentGenerationsTable.userId, userId));
      await tx.delete(supportMessagesTable).where(eq(supportMessagesTable.userId, userId));
      await tx.delete(referralsTable).where(eq(referralsTable.referrerUserId, userId));
      await tx.delete(paymentsTable).where(eq(paymentsTable.userId, userId));
      await tx.delete(contentCalendarTable).where(eq(contentCalendarTable.userId, userId));
      await tx.delete(favoritesTable).where(eq(favoritesTable.userId, userId));
      await tx.delete(usageLogsTable).where(eq(usageLogsTable.userId, userId));
      await tx.delete(dailyPlansTable).where(eq(dailyPlansTable.userId, userId));
      await tx.delete(featureUsageLogsTable).where(eq(featureUsageLogsTable.userId, userId));
      await tx.delete(securityLogsTable).where(eq(securityLogsTable.userId, userId));
      await tx.delete(impersonationSessionsTable).where(eq(impersonationSessionsTable.adminId, userId));
      await tx.delete(impersonationSessionsTable).where(eq(impersonationSessionsTable.targetUserId, userId));
      await tx.delete(usersTable).where(eq(usersTable.id, userId));
    });

    res.json({ success: true });
  } catch (err: any) {
    console.error("Account deletion error:", err);
    res.status(500).json({ error: "Failed to delete account. Please contact support." });
  }
});

export default router;
