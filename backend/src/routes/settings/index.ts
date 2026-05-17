import { Router, type IRouter } from "express";
import { db, usersTable, contentGenerationsTable, favoritesTable } from "@workspace/db";
import { eq, and, sql, desc } from "drizzle-orm";

const router: IRouter = Router();

import { requireAuth } from "../../middlewares/planMiddleware";

if (process.env.NODE_ENV !== "production") {
  router.get("/test", (req, res) => res.json({ ok: true }));
}

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
  const { username, displayName, showOnLeaderboard, avatarUrl, niche } = req.body;
  const updates: any = {};

  if (typeof username === "string") updates.username = username.toLowerCase().replace(/[^a-z0-9_]/g, "");
  if (typeof displayName === "string") updates.displayName = displayName;
  if (typeof showOnLeaderboard === "boolean") updates.showOnLeaderboard = showOnLeaderboard;
  if (typeof avatarUrl === "string") updates.avatarUrl = avatarUrl;
  if (typeof niche === "string") updates.niche = niche;

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
  try {
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.userId));
    const generations = await db.select()
      .from(contentGenerationsTable)
      .where(eq(contentGenerationsTable.userId, req.userId))
      .orderBy(desc(contentGenerationsTable.createdAt))
      .limit(500);
    const savedItems = await db.select().from(favoritesTable).where(eq(favoritesTable.userId, req.userId));
    
    // Build clean, readable export
    const cleanExport = {
      exportInfo: {
        exportedAt: new Date().toLocaleString('en-IN'),
        exportedBy: user?.email || "Unknown",
        totalGenerations: generations.length,
        savedItems: savedItems.length,
        note: "This file contains your GrowFlow AI data. Keep it safe."
      },
      
      yourAccount: {
        name: user?.displayName || user?.firstName || "Not set",
        email: user?.email || "Not set",
        plan: user?.planType || "free",
        memberSince: user?.createdAt ? new Date(user.createdAt).toLocaleDateString('en-IN') : "Unknown",
        totalGenerations: user?.totalGenerations || 0,
        referralCode: user?.referralCode || "None",
      },
      
      contentHistory: generations.map(g => ({
        date: g.createdAt ? new Date(g.createdAt).toLocaleDateString('en-IN', { 
          day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
        }) : "Unknown",
        type: g.contentType || "Content",
        topic: g.idea || "Unknown topic",
        language: g.promptLanguage || "English",
        platforms: g.platform || "All",
        // Only include the actual content text, not technical fields
        instagramCaption: (g.content as any)?.instagram?.caption?.substring(0, 200) + "..." || null,
        youtubeScript: (g.content as any)?.youtube?.script?.substring(0, 200) + "..." || null,
        twitterThread: Array.isArray((g.content as any)?.twitter?.tweets) 
          ? (g.content as any)?.twitter?.tweets?.[0]?.substring(0, 200) + "..."
          : null,
        linkedinPost: (g.content as any)?.linkedin?.post?.substring(0, 200) + "..." || null,
      })),
      
      savedContent: savedItems.length > 0 
        ? `You have ${savedItems.length} saved items. View them in the GrowFlow AI app.`
        : "No saved items.",
    };
    
    // Set headers for file download
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="growflow-my-data-${new Date().toISOString().split('T')[0]}.json"`);
    res.json(cleanExport);
  } catch (err) {
    res.status(500).json({ error: "Failed to export data" });
  }
});

router.get("/preferences", requireAuth, async (req: any, res) => {
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.userId));
  res.json({
    languagePreference: user?.languagePreference || "en",
    emailReports: user?.emailReports ?? true
  });
});

router.patch("/preferences", requireAuth, async (req: any, res) => {
  const { emailReports, streakReminders, productUpdates, preferredLanguage, languagePreference, niche } = req.body;
  const updates: any = {};
  if (typeof emailReports === "boolean") updates.emailReports = emailReports;
  if (typeof streakReminders === "boolean") updates.streakReminders = streakReminders;
  if (typeof productUpdates === "boolean") updates.productUpdates = productUpdates;
  if (typeof preferredLanguage === "string") updates.languagePreference = preferredLanguage;
  if (typeof languagePreference === "string") updates.languagePreference = languagePreference;
  if (typeof niche === "string") updates.niche = niche;

  if (Object.keys(updates).length > 0) {
    await db.update(usersTable).set(updates).where(eq(usersTable.id, req.userId));
  }
  res.json({ success: true });
});

export default router;
