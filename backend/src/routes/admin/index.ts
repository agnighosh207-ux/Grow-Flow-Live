import { Router, type IRouter } from "express";
import { getAuth } from "@clerk/express";
import { db, usersTable, usageLogsTable, contentGenerationsTable, referralsTable, systemSettingsTable, globalAnnouncementsTable } from "@workspace/db";
import { isNotNull, desc, sql, eq } from "drizzle-orm";
import crypto from "crypto";
import { requireAuth } from "../../middlewares/planMiddleware";

const router: IRouter = Router();

// requireAuth is now centralized in planMiddleware.ts (Flaw 20 fix)

const requireAdmin = async (req: any, res: any, next: any) => {
  try {
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.userId));
    
    // Check for explicit admin flag or fallback to env-configured email
    const isExplicitAdmin = user?.isAdmin === true;
    const isEnvAdmin = user?.email && process.env.ADMIN_EMAIL && user.email === process.env.ADMIN_EMAIL;

    if (!isExplicitAdmin && !isEnvAdmin) {
      return res.status(403).json({ error: "Forbidden" });
    }
    next();
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
  }
};

router.get("/admin/stats", requireAuth, requireAdmin, async (req: any, res: any) => {
  try {
    const [
      totalUsersResult,
      totalEmailsResult,
      totalGenerationsResult,
      recentUsers,
      revenueResult,
      languageStats,
      dauDataList,
      topReferrers,
      generationsDataList,
      settingsResult,
      activeAnnouncements
    ] = await Promise.all([
      db.select({ count: sql<number>`count(*)` }).from(usersTable),
      db.select({ count: sql<number>`count(*)` }).from(usersTable).where(isNotNull(usersTable.email)),
      db.select({ count: sql<number>`count(*)` }).from(usageLogsTable),
      db.select({
        id: usersTable.id,
        email: usersTable.email,
        planType: usersTable.planType,
        subscriptionStatus: usersTable.subscriptionStatus,
        createdAt: usersTable.createdAt
      }).from(usersTable).orderBy(desc(usersTable.createdAt)).limit(100),
      db.select({
        plan: usersTable.planType,
        count: sql<number>`count(*)`
      }).from(usersTable).where(eq(usersTable.subscriptionStatus, 'active')).groupBy(usersTable.planType),
      db.select({
        name: usageLogsTable.promptLanguage,
        value: sql<number>`count(*)`
      }).from(usageLogsTable).groupBy(usageLogsTable.promptLanguage),
      db.execute(sql`
        SELECT DATE(last_login_at) as date, COUNT(*) as activeUsers 
        FROM users 
        WHERE last_login_at >= NOW() - INTERVAL '30 days' 
        GROUP BY DATE(last_login_at) 
        ORDER BY date ASC
      `),
      db.execute(sql`
        SELECT u.id, u.email, COUNT(r.id) as referralscount
        FROM users u
        JOIN referrals r ON u.id = r.referrer_user_id
        WHERE r.reward_granted = true
        GROUP BY u.id, u.email
        ORDER BY referralscount DESC
        LIMIT 20
      `),
      db.execute(sql`
        SELECT DATE(created_at) as date, COUNT(*) as generations 
        FROM usage_logs 
        WHERE created_at >= NOW() - INTERVAL '30 days' 
        GROUP BY DATE(created_at) 
        ORDER BY date ASC
      `),
      db.select().from(systemSettingsTable).where(eq(systemSettingsTable.id, "global")),
      db.select()
        .from(globalAnnouncementsTable)
        .where(eq(globalAnnouncementsTable.isActive, true))
        .orderBy(desc(globalAnnouncementsTable.createdAt))
    ]);

    const languageData = languageStats.length > 0 
      ? languageStats.map(s => ({ name: s.name, value: Number(s.value) }))
      : [{ name: "No Data", value: 0 }];

    const revenueData = revenueResult.map(r => ({
      name: r.plan || "free",
      amount: (r.plan === "starter" ? 109 : r.plan === "creator" ? 249 : r.plan === "infinity" ? 499 : 0) * Number(r.count)
    })).filter(r => r.amount > 0);

    const [settings] = settingsResult;
    const maintenanceMode = settings?.maintenanceMode || false;

    res.json({
      maintenanceMode,
      totalUsers: Number(totalUsersResult[0].count) || 0,
      totalEmails: Number(totalEmailsResult[0].count) || 0,
      totalGenerations: Number(totalGenerationsResult[0].count) || 0,
      recentUsers: recentUsers,
      dauData: dauDataList.rows || [],
      generationsData: generationsDataList.rows || [],
      languageData,
      revenueData,
      topReferrers: topReferrers.rows || [],
      activeAnnouncements
    });
  } catch (err: any) {
    console.error("Admin stats error:", err);
    res.status(500).json({ error: "Failed to fetch admin stats" });
  }
});

router.patch("/admin/modify-user", requireAuth, requireAdmin, async (req: any, res: any): Promise<void> => {
  try {
    const { targetUserId, newPlan } = req.body;
    if (!targetUserId || !newPlan) {
      res.status(400).json({ error: "Missing required fields" });
      return;
    }

    let generationsLimit = 3;
    let newStatus = "active";
    if (newPlan === "creator") {
      generationsLimit = 100;
    } else if (newPlan === "infinity") {
      generationsLimit = 300;
    } else if (newPlan === "starter") {
      generationsLimit = 20;
    } else {
      newStatus = "free";
    }

    await db.update(usersTable)
      .set({
        planType: newPlan,
        planTier: newPlan.toUpperCase() as any,
        subscriptionStatus: newStatus,
        generationsRemaining: generationsLimit
      })
      .where(eq(usersTable.id, targetUserId));

    res.json({ success: true, message: `User upgraded to ${newPlan} successfully.` });
  } catch (error) {
    console.error("Failed to modify user:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/admin/impersonate", requireAuth, requireAdmin, async (req: any, res: any): Promise<void> => {
  try {
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: "Failed to impersonate" });
  }
});



router.post("/admin/announcement", requireAuth, requireAdmin, async (req: any, res: any) => {
  try {
    const { message, isActive, theme } = req.body;
    
    
    await db.insert(globalAnnouncementsTable).values({
      id: crypto.randomUUID(),
      message,
      isActive: Boolean(isActive),
      theme: theme || "info"
    });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to save announcement" });
  }
});

router.delete("/admin/announcement/:id", requireAuth, requireAdmin, async (req: any, res: any) => {
  try {
    await db.delete(globalAnnouncementsTable).where(eq(globalAnnouncementsTable.id, req.params.id));
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete announcement" });
  }
});

router.patch("/admin/settings/maintenance", requireAuth, requireAdmin, async (req: any, res: any): Promise<void> => {
  try {
    const { maintenanceMode } = req.body;
    
    // Upsert the global setting
    await db.insert(systemSettingsTable)
      .values({
        id: "global",
        maintenanceMode: Boolean(maintenanceMode),
        updatedAt: new Date()
      })
      .onConflictDoUpdate({
        target: systemSettingsTable.id,
        set: {
          maintenanceMode: Boolean(maintenanceMode),
          updatedAt: new Date()
        }
      });
      
    res.json({ success: true, maintenanceMode });
  } catch (err: any) {
    console.error("Maintenance toggle error:", err);
    res.status(500).json({ error: "Failed to fully toggle maintenance settings" });
  }
});

export default router;
