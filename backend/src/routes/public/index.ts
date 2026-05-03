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

export default router;
