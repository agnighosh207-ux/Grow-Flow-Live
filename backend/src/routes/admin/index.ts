import { Router, type IRouter } from "express";
import { getAuth } from "@clerk/express";
import { db, usersTable, usageLogsTable, contentGenerationsTable, referralsTable, systemSettingsTable, globalAnnouncementsTable, featureUsageLogsTable, impersonationSessionsTable, securityLogsTable } from "@workspace/db";
import { isNotNull, desc, sql, eq } from "drizzle-orm";
import crypto from "crypto";
import { requireAuth } from "../../middlewares/planMiddleware";
import { logger } from "../../lib/logger";
import { invalidateAuthCache } from "../../middlewares/authSyncMiddleware";

const router: IRouter = Router();

// requireAuth is now centralized in planMiddleware.ts (Flaw 20 fix)

const requireAdmin = async (req: any, res: any, next: any) => {
  try {
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.userId));
    
    if (!user) {
      return res.status(401).json({ error: "User not found" });
    }

    // Check for explicit admin flag or fallback to env-configured email
    const isExplicitAdmin = user.isAdmin === true;
    const isEnvAdmin = user.email && process.env.ADMIN_EMAIL && user.email === process.env.ADMIN_EMAIL;

    if (!isExplicitAdmin && !isEnvAdmin) {
      console.warn(`[AUTH] Admin access denied for user: ${user.email} (${req.userId})`);
      return res.status(403).json({ error: "Forbidden" });
    }
    next();
  } catch (error: any) {
    logger.error({ error: error?.message }, "[AUTH] Admin check error");
    res.status(500).json({ error: "Internal server error" });
  }
};

router.get("/admin/stats", requireAuth, requireAdmin, async (req: any, res: any) => {
  try {
    const safeQuery = async <T>(promise: Promise<T>, fallback: T, label: string): Promise<T> => {
      try {
        return await promise;
      } catch (e: any) {
        logger.error({ error: e.message, label }, "[ADMIN-STATS] Query failed");
        return fallback;
      }
    };

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
      activeAnnouncements,
      featureUsageData
    ] = await Promise.all([
      safeQuery(db.select({ count: sql<string>`count(*)` }).from(usersTable), [{ count: "0" }], "totalUsers"),
      safeQuery(db.select({ count: sql<string>`count(*)` }).from(usersTable).where(isNotNull(usersTable.email)), [{ count: "0" }], "totalEmails"),
      safeQuery(db.select({ count: sql<string>`count(*)` }).from(contentGenerationsTable), [{ count: "0" }], "totalGenerations"),
      safeQuery(db.select({
        id: usersTable.id,
        email: usersTable.email,
        planType: usersTable.planType,
        subscriptionStatus: usersTable.subscriptionStatus,
        createdAt: usersTable.createdAt
      }).from(usersTable).orderBy(desc(usersTable.createdAt)).limit(100), [], "recentUsers"),
      safeQuery(db.select({
        plan: usersTable.planType,
        totalAmount: sql<number>`SUM(${usersTable.subscriptionAmount})`
      }).from(usersTable).where(eq(usersTable.subscriptionStatus, 'active')).groupBy(usersTable.planType), [], "revenue"),
      safeQuery(db.select({
        name: contentGenerationsTable.contentType,
        value: sql<string>`count(*)`
      }).from(contentGenerationsTable).groupBy(contentGenerationsTable.contentType), [], "languageStats"),
      safeQuery(db.select({
        date: sql`(${usersTable.lastLoginAt}::date)` as any,
        activeusers: sql<string>`count(*)`
      })
      .from(usersTable)
      .where(sql`${usersTable.lastLoginAt} >= NOW() - INTERVAL '30 days'`)
      .groupBy(sql`1`)
      .orderBy(sql`1 ASC`), [], "dauData"),
      safeQuery(db.execute(sql`
        SELECT u.id, u.email, COUNT(r.id)::int as referralscount
        FROM users u
        JOIN referrals r ON u.id = r.referrer_user_id
        WHERE r.reward_granted = true
        GROUP BY u.id, u.email
        ORDER BY referralscount DESC
        LIMIT 20
      `), { rows: [] } as any, "topReferrers"),
      safeQuery(db.select({
        date: sql`(${contentGenerationsTable.createdAt}::date)` as any,
        generations: sql<string>`count(*)`
      })
      .from(contentGenerationsTable)
      .where(sql`${contentGenerationsTable.createdAt} >= NOW() - INTERVAL '30 days'`)
      .groupBy(sql`1`)
      .orderBy(sql`1 ASC`), [], "generationsData"),
      safeQuery(db.select().from(systemSettingsTable).where(eq(systemSettingsTable.id, "global")), [], "settings"),
      safeQuery(db.select()
        .from(globalAnnouncementsTable)
        .orderBy(desc(globalAnnouncementsTable.createdAt)), [], "announcements"),
      safeQuery(db.select({
        feature: featureUsageLogsTable.feature,
        count: sql<string>`count(*)`
      })
      .from(featureUsageLogsTable)
      .where(sql`${featureUsageLogsTable.createdAt} >= NOW() - INTERVAL '30 days'`)
      .groupBy(featureUsageLogsTable.feature), [], "featureUsageData")
    ]);

    const languageData = languageStats.length > 0 
      ? languageStats.map(s => ({ name: s.name, value: Number(s.value) }))
      : [{ name: "No Data", value: 0 }];

    const revenueData = revenueResult.map(r => ({
      name: r.plan || "free",
      amount: Math.round((Number(r.totalAmount) || 0) / 100) // Convert paise to rupees
    })).filter(r => r.amount > 0);

    const [settings] = settingsResult;
    const maintenanceMode = settings?.maintenanceMode || false;

    res.json({
      maintenanceMode,
      totalUsers: Number(totalUsersResult[0]?.count) || 0,
      totalEmails: Number(totalEmailsResult[0]?.count) || 0,
      totalGenerations: Number(totalGenerationsResult[0]?.count) || 0,
      recentUsers: recentUsers,
      dauData: dauDataList || [],
      generationsData: generationsDataList || [],
      languageData,
      revenueData,
      topReferrers: (topReferrers as any).rows || [],
      activeAnnouncements,
      featureUsageData: featureUsageData.map((f: any) => ({ feature: f.feature, count: Number(f.count) }))
    });

  } catch (err: any) {
    logger.error({ err }, "Admin stats error");
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

    let generationsLimit = 5;
    let newStatus = "active";
    let newTier = "FREE";

    if (newPlan === "starter") {
      generationsLimit = 20;
      newTier = "STARTER";
    } else if (newPlan === "creator") {
      generationsLimit = 100;
      newTier = "CREATOR";
    } else if (newPlan === "infinity") {
      generationsLimit = 9999;
      newTier = "INFINITY";
    } else if (newPlan === "free") {
      generationsLimit = 5;
      newStatus = "free";
      newTier = "FREE";
    }

    await db.update(usersTable)
      .set({
        planType: newPlan,
        planTier: newTier as any,
        subscriptionStatus: newStatus,
        generationsRemaining: generationsLimit
      })
      .where(eq(usersTable.id, targetUserId));

    invalidateAuthCache(targetUserId);

    res.json({ success: true, message: `User upgraded to ${newPlan} successfully.` });
  } catch (error) {
    logger.error({ error }, "Failed to modify user");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/admin/impersonate", requireAuth, requireAdmin, async (req: any, res: any): Promise<void> => {
  try {
    const { targetUserId, reason = "manual_troubleshooting", duration = 3600 } = req.body;
    
    if (!targetUserId) {
      res.status(400).json({ error: "Missing targetUserId" });
      return;
    }

    // Validate target exists
    const [target] = await db.select().from(usersTable).where(eq(usersTable.id, targetUserId));
    if (!target) {
      res.status(404).json({ error: "Target user not found" });
      return;
    }

    // Create session
    const sessionId = crypto.randomUUID();
    await db.insert(impersonationSessionsTable).values({
      id: sessionId,
      adminId: req.userId,
      targetUserId,
      reason,
      startedAt: new Date(),
      expiresAt: new Date(Date.now() + duration * 1000),
      ipAddress: req.ip
    });

    // Log it
    await db.insert(securityLogsTable).values({
      id: crypto.randomUUID(),
      userId: req.userId,
      eventType: "ADMIN_IMPERSONATION_START",
      ipAddress: req.ip,
      metadata: { targetUserId, sessionId, reason, duration }
    }).catch(err => logger.error({ err }, "Failed to log impersonation"));

    res.json({ success: true, sessionId });
  } catch (err: any) {
    logger.error({ err }, "Impersonation error");
    res.status(500).json({ error: "Failed to create impersonation session" });
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
    logger.error({ err }, "Maintenance toggle error");
    res.status(500).json({ error: "Failed to fully toggle maintenance settings" });
  }
});

export default router;
