import { Router, type IRouter } from "express";
import { getAuth } from "@clerk/express";
import { eq, and, gte, sql } from "drizzle-orm";
import { db, contentGenerationsTable } from "@workspace/db";

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

function getSuggestedImprovement(consistencyScore: number): string {
  if (consistencyScore >= 7) {
    return "Incredible! You posted every day this week. Keep that momentum — try experimenting with a new content format next week.";
  } else if (consistencyScore >= 5) {
    return "Strong consistency! You're posting most days. Try scheduling posts in advance to fill the gaps and hit 7/7 next week.";
  } else if (consistencyScore >= 3) {
    return "Good start! You posted on " + consistencyScore + " days. Set a daily reminder and aim for 5+ days next week.";
  } else if (consistencyScore >= 1) {
    return "You've made a start! The key to growth is showing up regularly. Aim to post at least once every two days next week.";
  } else {
    return "This week is a fresh start! Even one post per day can dramatically boost your reach. Begin today.";
  }
}

router.get("/stats/weekly", requireAuth, async (req: any, res): Promise<void> => {
  try {
    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - 6);
    weekStart.setHours(0, 0, 0, 0);

    const rows = await db
      .select({
        createdAt: contentGenerationsTable.createdAt,
      })
      .from(contentGenerationsTable)
      .where(
        and(
          eq(contentGenerationsTable.userId, req.userId),
          gte(contentGenerationsTable.createdAt, weekStart),
        ),
      );

    const totalGenerations = rows.length;

    const uniqueDays = new Set<string>();
    for (const row of rows) {
      const d = new Date(row.createdAt);
      const dayKey = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
      uniqueDays.add(dayKey);
    }
    const consistencyScore = uniqueDays.size;

    const suggestedImprovement = getSuggestedImprovement(consistencyScore);

    res.json({
      totalGenerations,
      consistencyScore,
      consistencyLabel: `${consistencyScore}/7 days`,
      suggestedImprovement,
      weekStart: weekStart.toISOString(),
      weekEnd: now.toISOString(),
    });
  } catch (err: any) {
    res.status(500).json({ error: "Failed to fetch weekly stats." });
  }
});

export default router;
