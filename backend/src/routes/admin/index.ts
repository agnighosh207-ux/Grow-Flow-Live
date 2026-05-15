import { Router, type IRouter } from "express";
import { getAuth, clerkClient } from "@clerk/express";
import { db, usersTable, usageLogsTable, contentGenerationsTable, referralsTable, systemSettingsTable, globalAnnouncementsTable, featureUsageLogsTable, impersonationSessionsTable, securityLogsTable } from "@workspace/db";
import { isNotNull, desc, sql, eq, ilike, count } from "drizzle-orm";
import crypto from "crypto";
import { requireAuth, TIER_CREDITS } from "../../middlewares/planMiddleware";
import { sendPersonalReengagementEmail } from "../../services/email";
import { logger } from "../../lib/logger";
import { invalidateAuthCache } from "../../middlewares/authSyncMiddleware";

const router: IRouter = Router();

// requireAuth is now centralized in planMiddleware.ts (Flaw 20 fix)

const requireAdmin = async (req: any, res: any, next: any) => {
  try {
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.userId));
    if (!user) {
      res.status(401).json({ error: "User not found" });
      return;
    }

    const adminEmailFromEnv = (process.env.ADMIN_EMAIL || "").toLowerCase();
    
    if (!user || (!user.isAdmin && user.email?.toLowerCase() !== adminEmailFromEnv)) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }

    // Auto-escalate if email matches but DB flag is missing
    if (!user.isAdmin && user.email?.toLowerCase() === adminEmailFromEnv) {
      await db.update(usersTable).set({ isAdmin: true }).where(eq(usersTable.id, user.id));
    }

    next();
  } catch (error: any) {
    logger.error({ error: error?.message }, "[AUTH] Admin check error");
    res.status(500).json({ error: "Internal server error" });
  }
};

router.post("/sync", requireAuth, requireAdmin, async (req: any, res: any) => {
  invalidateAuthCache(req.userId);
  res.json({ success: true, message: "Admin cache synchronized" });
});

router.get("/stats", requireAuth, requireAdmin, async (req: any, res: any) => {
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
      featureUsageData,
      couponStats,
      churnRisk
    ] = await Promise.all([
      safeQuery(db.select({ count: sql<string>`count(*)` }).from(usersTable), [{ count: "0" }], "totalUsers"),
      safeQuery(db.select({ count: sql<string>`count(*)` }).from(usersTable).where(isNotNull(usersTable.email)), [{ count: "0" }], "totalEmails"),
      safeQuery(db.select({ count: sql<string>`count(*)` }).from(contentGenerationsTable), [{ count: "0" }], "totalGenerations"),
      safeQuery(db.execute(sql`
        SELECT u.id, u.email, u.plan_type, u.subscription_status, u.created_at, COUNT(cg.id)::int as generations_count
        FROM users u
        LEFT JOIN content_generations cg ON u.id = cg.user_id
        GROUP BY u.id
        ORDER BY u.created_at DESC
        LIMIT 100
      `), { rows: [] } as any, "recentUsers"),
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
      .groupBy(featureUsageLogsTable.feature), [], "featureUsageData"),
      safeQuery(db.select({
        code: usersTable.couponCode,
        count: count()
      })
      .from(usersTable)
      .where(isNotNull(usersTable.couponCode))
      .groupBy(usersTable.couponCode), [], "couponStats"),
      safeQuery(db.execute(sql`
        SELECT 
          u.id, u.email, u.plan_type, u.plan_tier,
          u.subscription_status,
          u.current_streak,
          u.generations_remaining,
          EXTRACT(DAY FROM NOW() - u.last_login_at) as days_since_login,
          COUNT(cg.id) as gens_last_30_days,
          CASE 
            WHEN EXTRACT(DAY FROM NOW() - u.last_login_at) > 14 AND u.subscription_status = 'active' 
              THEN 'HIGH'
            WHEN EXTRACT(DAY FROM NOW() - u.last_login_at) > 7 AND u.generations_remaining > 5 
              THEN 'MEDIUM'
            ELSE 'LOW'
          END as churn_risk
        FROM users u
        LEFT JOIN content_generations cg ON cg.user_id = u.id 
          AND cg.created_at > NOW() - INTERVAL '30 days'
        WHERE u.subscription_status = 'active'
          AND u.plan_tier != 'FREE'
        GROUP BY u.id
        HAVING (
          CASE 
            WHEN EXTRACT(DAY FROM NOW() - u.last_login_at) > 14 AND u.subscription_status = 'active' THEN 'HIGH'
            WHEN EXTRACT(DAY FROM NOW() - u.last_login_at) > 7 AND u.generations_remaining > 5 THEN 'MEDIUM'
            ELSE 'LOW'
          END
        ) IN ('HIGH', 'MEDIUM')
        ORDER BY churn_risk DESC, days_since_login DESC
        LIMIT 50
      `), { rows: [] } as any, "churnRisk")
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

    let augmentedRecentUsers = (recentUsers as any).rows || [];
    try {
      const missingEmailIds = augmentedRecentUsers.filter((u: any) => !u.email).map((u: any) => u.id);
      if (missingEmailIds.length > 0) {
        const clerkUsersResp = await clerkClient.users.getUserList({ userId: missingEmailIds, limit: 100 });
        const emailMap = new Map();
        for (const cu of clerkUsersResp.data) {
          if (cu.emailAddresses && cu.emailAddresses.length > 0) {
            emailMap.set(cu.id, cu.emailAddresses[0].emailAddress);
          }
        }
        augmentedRecentUsers = augmentedRecentUsers.map((u: any) => {
          if (!u.email && emailMap.has(u.id)) {
            return { ...u, email: emailMap.get(u.id) };
          }
          return u;
        });
      }
    } catch (e) {
      logger.error("Failed to fetch missing emails from Clerk for admin stats");
    }

    res.json({
      maintenanceMode,
      totalUsers: Number(totalUsersResult[0]?.count) || 0,
      totalEmails: Number(totalEmailsResult[0]?.count) || 0,
      totalGenerations: Number(totalGenerationsResult[0]?.count) || 0,
      recentUsers: augmentedRecentUsers,
      dauData: dauDataList || [],
      generationsData: generationsDataList || [],
      languageData,
      revenueData,
      topReferrers: (topReferrers as any).rows || [],
      activeAnnouncements,
      featureUsageData: featureUsageData.map((f: any) => ({ feature: f.feature, count: Number(f.count) })),
      couponStats: couponStats || [],
      churnRisk: (churnRisk as any).rows || []
    });

  } catch (err: any) {
    logger.error({ err }, "Admin stats error");
    res.status(500).json({ error: "Failed to fetch admin stats" });
  }
});

router.patch("/modify-user", requireAuth, requireAdmin, async (req: any, res: any): Promise<void> => {
  try {
    const { targetUserId, newPlan, newTier, newStatus } = req.body;
    if (!targetUserId || !newPlan || !newTier) {
      res.status(400).json({ error: "Missing required fields" });
      return;
    }

    const generationsLimit = TIER_CREDITS[newTier as keyof typeof TIER_CREDITS] || 5;

    await db.update(usersTable)
      .set({
        planType: newPlan,
        planTier: newTier as any,
        subscriptionStatus: newStatus || 'active',
        generationsRemaining: generationsLimit,
        lastCreditReset: new Date() // --- H-5 FIX: Reset credit cycle to now ---
      })
      .where(eq(usersTable.id, targetUserId));

    invalidateAuthCache(targetUserId);

    res.json({ success: true, message: `User upgraded to ${newPlan} successfully.` });
  } catch (error) {
    logger.error({ error }, "Failed to modify user");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/impersonate", requireAuth, requireAdmin, async (req: any, res: any): Promise<void> => {
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
      userAgent: req.get("User-Agent") || "unknown",
      metadata: { targetUserId, sessionId, reason, duration }
    }).catch(err => logger.error({ err }, "Failed to log impersonation"));

    res.json({ success: true, sessionId });
  } catch (err: any) {
    logger.error({ err }, "Impersonation error");
    res.status(500).json({ error: "Failed to create impersonation session" });
  }
});



router.post("/announcement", requireAuth, requireAdmin, async (req: any, res: any) => {
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

router.delete("/announcement/:id", requireAuth, requireAdmin, async (req: any, res: any) => {
  try {
    await db.delete(globalAnnouncementsTable).where(eq(globalAnnouncementsTable.id, req.params.id));
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete announcement" });
  }
});

router.patch("/settings/maintenance", requireAuth, requireAdmin, async (req: any, res: any): Promise<void> => {
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

// 1. Search users by email or ID
router.get("/users/search", requireAuth, requireAdmin, async (req: any, res: any) => {
  try {
    const q = typeof req.query.q === "string" ? req.query.q : "";
    if (!q || q.length < 2) {
      res.status(400).json({ error: "Query must be at least 2 characters" });
      return;
    }

    const results = await db
      .select()
      .from(usersTable)
      .where(sql`${usersTable.email} ILIKE ${`%${q}%`} OR ${usersTable.id} = ${q}`)
      .limit(20);

    let augmentedResults = results;
    try {
      const missingEmailIds = augmentedResults.filter((u) => !u.email).map((u) => u.id);
      if (missingEmailIds.length > 0) {
        const clerkUsersResp = await clerkClient.users.getUserList({ userId: missingEmailIds, limit: 20 });
        const emailMap = new Map();
        for (const cu of clerkUsersResp.data) {
          if (cu.emailAddresses && cu.emailAddresses.length > 0) {
            emailMap.set(cu.id, cu.emailAddresses[0].emailAddress);
          }
        }
        augmentedResults = augmentedResults.map((u) => {
          if (!u.email && emailMap.has(u.id)) {
            return { ...u, email: emailMap.get(u.id) };
          }
          return u;
        });
      }
    } catch (e) {
      logger.error("Failed to augment search results with Clerk API");
    }

    res.json(augmentedResults);
  } catch (err) {
    res.status(500).json({ error: "Search failed" });
  }
});

// 2. Get full user details
router.get("/users/:id", requireAuth, requireAdmin, async (req: any, res: any) => {
  try {
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.params.id));
    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    const [genStats] = await db.select({ count: count() }).from(contentGenerationsTable).where(eq(contentGenerationsTable.userId, user.id));
    const [referralStats] = await db.select({ count: count() }).from(referralsTable).where(eq(referralsTable.referrerUserId, user.id));

    res.json({
      ...user,
      totalGenerationsCount: Number(genStats?.count || 0),
      referralsCount: Number(referralStats?.count || 0)
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch user details" });
  }
});

// 3. Grant bonus credits
router.post("/users/:id/grant-credits", requireAuth, requireAdmin, async (req: any, res: any) => {
  try {
    const credits = Number(req.body.credits);
    if (isNaN(credits) || credits < 1 || credits > 1000) {
      res.status(400).json({ error: "Credits must be between 1 and 1000" });
      return;
    }

    const [updated] = await db.update(usersTable)
      .set({ generationsRemaining: sql`${usersTable.generationsRemaining} + ${credits}` })
      .where(eq(usersTable.id, req.params.id))
      .returning({ newBalance: usersTable.generationsRemaining });

    invalidateAuthCache(req.params.id);
    res.json({ success: true, newBalance: updated?.newBalance });
  } catch (err) {
    res.status(500).json({ error: "Failed to grant credits" });
  }
});

// 4. Ban a user
router.post("/users/:id/ban", requireAuth, requireAdmin, async (req: any, res: any) => {
  try {
    const { reason } = req.body;
    await db.update(usersTable)
      .set({ isBanned: true }) // banReason column does not exist in schema
      .where(eq(usersTable.id, req.params.id));

    await db.insert(securityLogsTable).values({
      id: crypto.randomUUID(),
      userId: req.params.id,
      eventType: "SYSTEM_BAN", // Use system ban event
      ipAddress: req.ip,
      userAgent: req.get("User-Agent") || "unknown",
      metadata: { reason, bannedBy: req.userId }
    });

    invalidateAuthCache(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to ban user" });
  }
});

// 5. Unban a user
router.post("/users/:id/unban", requireAuth, requireAdmin, async (req: any, res: any) => {
  try {
    await db.update(usersTable)
      .set({ isBanned: false })
      .where(eq(usersTable.id, req.params.id));

    invalidateAuthCache(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to unban user" });
  }
});

// 6. Reset credits
router.post("/users/:id/reset-credits", requireAuth, requireAdmin, async (req: any, res: any) => {
  try {
    const [user] = await db.select({ planTier: usersTable.planTier }).from(usersTable).where(eq(usersTable.id, req.params.id));
    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    const tier = user.planTier || "FREE";
    const defaultCredits = TIER_CREDITS[tier] || 5;

    const [updated] = await db.update(usersTable)
      .set({ generationsRemaining: defaultCredits, lastCreditReset: new Date() })
      .where(eq(usersTable.id, req.params.id))
      .returning({ newBalance: usersTable.generationsRemaining });

    invalidateAuthCache(req.params.id);
    res.json({ success: true, newBalance: updated?.newBalance });
  } catch (err) {
    res.status(500).json({ error: "Failed to reset credits" });
  }
});

// 7. Revenue breakdown
router.get("/revenue/breakdown", requireAuth, requireAdmin, async (req: any, res: any) => {
  try {
    const subs = await db.select({
      planType: usersTable.planType,
      billingCycle: usersTable.billingPeriod,
      status: usersTable.subscriptionStatus,
      amount: usersTable.subscriptionAmount,
    }).from(usersTable).where(isNotNull(usersTable.subscriptionStatus));

    let mrr = 0;
    const byPlan: any = {};
    let totalActive = 0;
    let totalCancelled = 0;

    subs.forEach(s => {
      if (s.status === 'active') {
        totalActive++;
        const amt = Number(s.amount || 0) / 100; // in INR
        const monthlyAmt = s.billingCycle === 'yearly' ? amt / 12 : amt;
        mrr += monthlyAmt;

        const key = `${s.planType}_${s.billingCycle}`;
        if (!byPlan[key]) byPlan[key] = { count: 0, mrr: 0 };
        byPlan[key].count++;
        byPlan[key].mrr += monthlyAmt;
      } else if (s.status === 'canceled') {
        totalCancelled++;
      }
    });

    const churnRate = totalActive + totalCancelled > 0 ? (totalCancelled / (totalActive + totalCancelled)) * 100 : 0;

    res.json({
      mrr: Math.round(mrr),
      arr: Math.round(mrr * 12),
      byPlan,
      churnRate: Number(churnRate.toFixed(2)),
      activeSubscribers: totalActive,
      cancelledSubscribers: totalCancelled
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch revenue breakdown" });
  }
});

router.patch("/announcement/:id", requireAuth, requireAdmin, async (req: any, res: any) => {
  try {
    const { isActive } = req.body;
    await db.update(globalAnnouncementsTable)
      .set({ isActive: Boolean(isActive) })
      .where(eq(globalAnnouncementsTable.id, req.params.id));
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to update announcement" });
  }
});

router.get("/system/status", requireAuth, requireAdmin, async (req: any, res: any) => {
  try {
    const providers = [
      { name: "Groq", env: "GROQ_API_KEY", model: "llama-3.1-8b-instant" },
      { name: "Together AI", env: "TOGETHER_AI_API_KEY", model: "llama-2-70b-chat" },
      { name: "Cerebras", env: "CEREBRAS_API_KEY", model: "llama3-70b" },
      { name: "SambaNova", env: "SAMBANOVA_API_KEY", model: "llama-3.1-405b" },
      { name: "Gemini", env: "GEMINI_API_KEY", model: "gemini-1.5-flash" },
      { name: "Perplexity", env: "PERPLEXITY_AI_API", model: "llama-3.1-sonar-small-128k-online" }
    ].map(p => ({
      name: p.name,
      configured: !!process.env[p.env],
      model: p.model
    }));

    res.json({
      providers,
      nodeVersion: process.version,
      uptime: process.uptime(),
      memoryUsageMB: Math.round(process.memoryUsage().heapUsed / 1024 / 1024)
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch system status" });
  }
});

router.post("/trigger-reengagement", requireAuth, requireAdmin, async (req: any, res: any) => {
  try {
    const { runReengagementLogic } = await import("../../scripts/reengagement-cron");
    const result = await runReengagementLogic();
    res.json({ success: true, ...result });
  } catch (err: any) {
    logger.error({ err }, "Manual re-engagement trigger failed");
    res.status(500).json({ error: err.message || "Failed to trigger re-engagement" });
  }
});

router.post("/reengagement/send-personal", requireAuth, requireAdmin, async (req: any, res: any) => {
  try {
    const { userId, email, daysSinceLogin, name } = req.body;
    if (!email || !userId) {
      res.status(400).json({ error: "Missing email or userId" });
      return;
    }

    await sendPersonalReengagementEmail(email, name, daysSinceLogin);
    
    // Log the re-engagement attempt
    await db.insert(securityLogsTable).values({
      id: crypto.randomUUID(),
      userId: userId,
      eventType: "ADMIN_PERSONAL_REENGAGEMENT",
      ipAddress: req.ip,
      userAgent: req.get("User-Agent") || "unknown",
      metadata: { adminId: req.userId, daysSinceLogin }
    }).catch(() => {});

    res.json({ success: true });
  } catch (err: any) {
    logger.error({ err }, "Personal re-engagement failed");
    res.status(500).json({ error: "Failed to send personal email" });
  }
});

export default router;
