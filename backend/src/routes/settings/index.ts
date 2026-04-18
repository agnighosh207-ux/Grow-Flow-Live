import { Router, type IRouter } from "express";
import { getAuth } from "@clerk/express";
import { db, usersTable, contentGenerationsTable, supportMessagesTable } from "@workspace/db";
import { eq, count } from "drizzle-orm";

const router: IRouter = Router();

const requireAuth = (req: any, res: any, next: any) => {
  const auth = getAuth(req);
  const userId = auth?.sessionClaims?.userId || auth?.userId;
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  req.userId = userId;
  next();
};

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
  });
});

router.patch("/settings/preferences", requireAuth, async (req: any, res): Promise<void> => {
  const { niche, tonePreference, platformPreference } = req.body;

  const updates: Record<string, string | null> = {};
  if (typeof niche === "string" || niche === null) updates.niche = niche || null;
  if (typeof tonePreference === "string" || tonePreference === null) updates.tonePreference = tonePreference || null;
  if (typeof platformPreference === "string" || platformPreference === null) updates.platformPreference = platformPreference || null;

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
    await db.delete(contentGenerationsTable).where(eq(contentGenerationsTable.userId, req.userId));
    await db.delete(supportMessagesTable).where(eq(supportMessagesTable.userId, req.userId));
    await db.delete(usersTable).where(eq(usersTable.id, req.userId));

    const secretKey = process.env.CLERK_SECRET_KEY;
    if (secretKey) {
      await fetch(`https://api.clerk.com/v1/users/${req.userId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${secretKey}` },
      });
    }

    res.json({ success: true });
  } catch (err: any) {
    console.error("Account deletion error:", err);
    res.status(500).json({ error: "Failed to delete account. Please contact support." });
  }
});

export default router;
