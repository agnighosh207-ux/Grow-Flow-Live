import { Router, type IRouter } from "express";
import { eq, gte, and, isNull } from "drizzle-orm";
import { db, usersTable, contentGenerationsTable } from "@workspace/db";
import { requireAuth } from "../../middlewares/planMiddleware";
import { AuthenticatedRequest } from "../../types";
import { Response } from "express";

const router: IRouter = Router();

router.get("/weekly", requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - 7);
    weekStart.setHours(0, 0, 0, 0);

    const [user] = await db.select({
      generationsRemaining: usersTable.generationsRemaining,
      currentStreak: usersTable.currentStreak,
    }).from(usersTable).where(eq(usersTable.id, req.userId));

    const [weeklyData] = await db
      .select({ count: db.$count(contentGenerationsTable, and(
        eq(contentGenerationsTable.userId, req.userId),
        gte(contentGenerationsTable.createdAt, weekStart),
        isNull(contentGenerationsTable.deletedAt)
      ))})
      .from(contentGenerationsTable)
      .where(and(
        eq(contentGenerationsTable.userId, req.userId),
        gte(contentGenerationsTable.createdAt, weekStart),
        isNull(contentGenerationsTable.deletedAt)
      ));

    const totalGenerations = Number((weeklyData as any)?.count ?? 0);
    
    let consistencyScore = 0;
    let consistencyLabel = "Getting Started";
    if (totalGenerations >= 14) { consistencyScore = 100; consistencyLabel = "On Fire 🔥"; }
    else if (totalGenerations >= 7) { consistencyScore = 75; consistencyLabel = "Consistent ✅"; }
    else if (totalGenerations >= 3) { consistencyScore = 50; consistencyLabel = "Building Habit 📈"; }
    else if (totalGenerations >= 1) { consistencyScore = 25; consistencyLabel = "Just Starting 🌱"; }

    const improvements = [
      "Try generating hooks before your main content — they perform 3x better.",
      "Post at least once daily this week. Consistency beats quality early on.",
      "Use the Trend Engine to find a trending topic in your niche today.",
      "Generate content for all 4 platforms and see which gets the most engagement.",
      "Try the A/B Hook Tester on your next post before publishing.",
    ];

    const now = new Date();
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 7);

    res.json({
      totalGenerations,
      consistencyScore,
      consistencyLabel,
      suggestedImprovement: improvements[Math.floor(Math.random() * improvements.length)],
      weekStart: weekStart.toISOString().split("T")[0],
      weekEnd: weekEnd.toISOString().split("T")[0],
      streak: user?.currentStreak ?? 0,
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch weekly stats" });
  }
});

export default router;
