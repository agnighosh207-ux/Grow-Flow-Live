import { Router, type IRouter } from "express";
import { getAuth } from "@clerk/express";
import { db, usersTable, contentGenerationsTable, supportMessagesTable, referralsTable, paymentsTable, contentCalendarTable, favoritesTable, usageLogsTable, dailyPlansTable } from "@workspace/db";
import { eq, count, and } from "drizzle-orm";

const router: IRouter = Router();

import { requireAuth } from "../../middlewares/planMiddleware";

router.get("/settings", requireAuth, async (req: any, res): Promise<void> => {
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.userId));

  res.json({
    notifications: {
      emailNotifications: user?.emailNotifications ?? true,
      productUpdates: user?.productUpdates ?? true,
      weeklyDigest: user?.weeklyDigest ?? true,
      marketingEmails: user?.marketingEmails ?? false,
    },
  });
});

router.patch("/settings/notifications", requireAuth, async (req: any, res): Promise<void> => {
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

router.get("/settings/preferences", requireAuth, async (req: any, res): Promise<void> => {
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.userId));

  res.json({
    niche: user?.niche ?? null,
    tonePreference: user?.tonePreference ?? null,
    platformPreference: user?.platformPreference ?? null,
    languagePreference: (user as any)?.languagePreference ?? "English",
  });
});

router.patch("/settings/preferences", requireAuth, async (req: any, res): Promise<void> => {
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



router.delete("/settings/account", requireAuth, async (req: any, res): Promise<void> => {
  try {
    const userId = req.userId;
    await db.transaction(async (tx) => {
      await tx.delete(contentGenerationsTable).where(eq(contentGenerationsTable.userId, userId));
      await tx.delete(supportMessagesTable).where(eq(supportMessagesTable.userId, userId));
      await tx.delete(referralsTable).where(eq(referralsTable.referrerUserId, userId));
      await tx.delete(paymentsTable).where(eq(paymentsTable.userId, userId));
      await tx.delete(contentCalendarTable).where(eq(contentCalendarTable.userId, userId));
      await tx.delete(favoritesTable).where(eq(favoritesTable.userId, userId));
      await tx.delete(usageLogsTable).where(eq(usageLogsTable.userId, userId));
      await tx.delete(dailyPlansTable).where(eq(dailyPlansTable.userId, userId));
      await tx.delete(usersTable).where(eq(usersTable.id, userId));
    });

    const secretKey = process.env.CLERK_SECRET_KEY;
    if (secretKey) {
      try {
        await fetch(`https://api.clerk.com/v1/users/${req.userId}`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${secretKey}` },
        });
      } catch (clerkErr) {
        console.warn("Clerk user deletion failed after DB transaction success:", clerkErr);
      }
    }

    res.json({ success: true });
  } catch (err: any) {
    console.error("Account deletion error:", err);
    res.status(500).json({ error: "Failed to delete account. Please contact support." });
  }
});

export default router;
