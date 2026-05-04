import { Router } from "express";
import { db, usersTable } from "@workspace/db";
import { desc, sql } from "drizzle-orm";
import { getCache, setCache } from "../../lib/redis";
import { logger } from "../../lib/logger";

const router = Router();

router.get("/top-creators", async (req, res) => {
  const cacheKey = "public:top-creators";
  const cached = await getCache<any[]>(cacheKey);
  if (cached) {
    res.json(cached);
    return;
  }

  try {
    const topCreators = await db.select({
      firstName: usersTable.firstName,
      totalGenerations: usersTable.totalGenerations,
      planTier: usersTable.planTier,
      createdAt: usersTable.createdAt
    })
    .from(usersTable)
    .orderBy(desc(sql`COALESCE(${usersTable.totalGenerations}, 0)`))
    .limit(10);

    const anonymized = topCreators.map((c, i) => ({
      name: c.firstName ? c.firstName : `GrowthPro #${Math.floor(Math.random() * 900) + 100}`,
      totalGenerations: c.totalGenerations || 0,
      planTier: c.planTier || "FREE",
      createdAt: c.createdAt
    }));

    await setCache(cacheKey, anonymized, 3600);
    res.json(anonymized);
  } catch (err) {
    logger.error({ err }, "Failed to fetch top creators");
    res.status(500).json({ error: "Failed to fetch top creators" });
  }
});

router.get("/creator/:code", async (req, res) => {
  const { code } = req.params;
  if (!code) { res.status(400).json({ error: "Code required" }); return; }

  try {
    const [user] = await db.select({
      firstName: usersTable.firstName,
      email: usersTable.email,
      planTier: usersTable.planTier,
      totalGenerations: usersTable.totalGenerations,
      currentStreak: usersTable.currentStreak,
      createdAt: usersTable.createdAt,
      niche: (usersTable as any).onboardingNiche
    })
    .from(usersTable)
    .where(sql`${usersTable.referralCode} = ${code}`);

    if (!user) {
      res.status(404).json({ error: "Creator not found" });
      return;
    }

    const displayName = user.firstName || (user.email ? user.email.split('@')[0] : "Creator");

    res.json({
      firstName: displayName,
      planTier: user.planTier || "FREE",
      totalGenerations: user.totalGenerations || 0,
      currentStreak: user.currentStreak || 0,
      createdAt: user.createdAt,
      niche: (user as any).niche || "Content Creator"
    });
  } catch (err) {
    logger.error({ err, code }, "Failed to fetch creator profile");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
