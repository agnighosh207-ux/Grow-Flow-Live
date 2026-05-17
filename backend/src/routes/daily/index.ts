import { Router, type IRouter } from "express";
import { getAuth } from "@clerk/express";
import { eq, and, sql } from "drizzle-orm";
import { db, usersTable, dailyPlansTable, featureUsageLogsTable, challengeParticipantsTable } from "@workspace/db";
import crypto from "crypto";
import { DailyResponseSchema } from "@workspace/api-zod";
import { requireAuth } from "../../middlewares/planMiddleware";
import { enforceGenerationLimit } from "../../middlewares/generationLimiter";
import { generateContent, extractJson } from "../../services/ai-engine";
import { LANGUAGE_INSTRUCTIONS } from "../../lib/languages";

const router: IRouter = Router();

function getTodayDate(): string {
  return new Date().toISOString().slice(0, 10);
}

function getYesterdayDate(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10);
}

function daysBetween(dateA: string | null | undefined, dateB: string | null | undefined): number {
  if (!dateA || !dateB) return 0;
  const a = new Date(dateA);
  const b = new Date(dateB);
  if (isNaN(a.getTime()) || isNaN(b.getTime())) return 0;
  const diff = Math.abs(a.getTime() - b.getTime());
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

function computeCurrentStreak(user: any): number {
  if (!user.lastStreakDate) return 0;
  const today = getTodayDate();
  const yesterday = getYesterdayDate();
  if (user.lastStreakDate === today || user.lastStreakDate === yesterday) {
    return user.currentStreak || 0;
  }
  return 0;
}

async function generateDailyPlanContent(userId: string, language: string): Promise<{ idea: string; hook: string; cta: string }> {
  const langInstruction = LANGUAGE_INSTRUCTIONS[language] || "";

  const systemPrompt = `You are a daily content strategist who gives creators ONE focused, achievable action each day. Your daily plans are:
- Specific enough to execute in under 2 hours
- Calibrated for an engaged creator audience
- Different every day (rotate topics, formats, angles)
- Written so the creator can immediately start working

${langInstruction}

Return ONLY valid JSON with this exact structure:
{
  "idea": "The specific content idea (one punchy sentence, like a video/post title)",
  "hook": "The exact opening line to start this piece of content (ready to use, no editing needed)",
  "cta": "The call-to-action to end this content piece (specific, action-oriented, one sentence)"
}`;

  const userPrompt = `Generate today's growth action for a content creator. Pick a content format and angle that would perform well today. Make it concrete, specific, and immediately actionable. The idea should be post-ready.`;

  const completion = await generateContent({
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    userPlan: "free",
    userId,
    language,
    maxTokens: 500,
    zodSchema: DailyResponseSchema
  });

  const content = completion.choices[0]?.message?.content || "{}";
  const parsed = extractJson(content);
  return {
    idea: parsed?.idea || "Share 3 lessons from your biggest failure this year",
    hook: parsed?.hook || "I failed publicly and it was the best thing that ever happened to me.",
    cta: parsed?.cta || "Comment 'LESSON' and I'll share the full story with you.",
  };
}

router.get("/today", requireAuth, async (req: any, res): Promise<void> => {
  const today = getTodayDate();
  const userId = req.userId;

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
  if (!user) { res.status(404).json({ error: "User not found" }); return; }

  const currentStreak = computeCurrentStreak(user);
  const language = (user as any).languagePreference || "English";

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  let [existing] = await db.select().from(dailyPlansTable)
    .where(and(
      eq(dailyPlansTable.userId, userId), 
      eq(dailyPlansTable.date, today),
      sql`${dailyPlansTable.createdAt} >= ${todayStart}`
    ));

  if (!existing) {
    try {
      const content = await generateDailyPlanContent(userId, language);
      [existing] = await db.insert(dailyPlansTable).values({
        userId,
        date: today,
        idea: content.idea,
        hook: content.hook,
        cta: content.cta,
      }).returning();
    } catch (err) {
      console.error("Daily plan generation error:", err);
      [existing] = await db.insert(dailyPlansTable).values({
        userId,
        date: today,
        idea: "Share the ONE thing you wish you knew when you started",
        hook: "Nobody told me this when I started, and it cost me 6 months.",
        cta: "Save this post — you'll want to come back to it.",
      }).onConflictDoNothing().returning();

      if (!existing) {
        [existing] = await db.select().from(dailyPlansTable)
          .where(and(eq(dailyPlansTable.userId, userId), eq(dailyPlansTable.date, today)));
      }
    }
  }

  const [challenge] = await db.select().from(challengeParticipantsTable)
    .where(and(eq(challengeParticipantsTable.userId, userId), eq(challengeParticipantsTable.challengeId, "30-day-creator-2026")));

  res.json({
    plan: existing,
    streak: currentStreak,
    completedToday: !!existing?.completedAt,
    challenge: challenge ? {
      joined: true,
      completedDays: challenge.completedDays,
      challengeId: challenge.challengeId,
    } : { joined: false, completedDays: 0, challengeId: "" },
  });
});

router.patch("/today/complete", requireAuth, async (req: any, res): Promise<void> => {
  try {
    const today = getTodayDate();
    const userId = req.userId;

    // Find today's daily plan for this user
    const [plan] = await db.select().from(dailyPlansTable)
      .where(and(eq(dailyPlansTable.userId, userId), eq(dailyPlansTable.date, today)));

    if (!plan) { res.status(404).json({ error: "No daily plan for today" }); return; }
    if (plan.completedAt) { 
      const [u] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
      res.json({ success: true, streak: computeCurrentStreak(u), alreadyCompleted: true }); 
      return; 
    }

    // Mark completed
    await db.update(dailyPlansTable).set({ completedAt: new Date() })
      .where(and(eq(dailyPlansTable.userId, userId), eq(dailyPlansTable.date, today)));

    // Increment streak
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
    if (!user) { res.status(404).json({ error: "User not found" }); return; }

    const yesterday = getYesterdayDate();
    let newStreak: number;
    if (!user.lastStreakDate) {
      newStreak = 1;
    } else if (user.lastStreakDate === yesterday) {
      newStreak = (user.currentStreak || 0) + 1;
    } else if (user.lastStreakDate === today) {
      newStreak = user.currentStreak || 1;
    } else {
      newStreak = 1;
    }

    const updates: any = { currentStreak: newStreak, lastStreakDate: today };
    let reward: { credits: number; message: string } | null = null;

    // Milestone Reward Logic
    if (newStreak > (user.currentStreak || 0)) {
      if (newStreak === 3) {
        updates.generationsRemaining = sql`${usersTable.generationsRemaining} + 1`;
        reward = { credits: 1, message: "🔥 3-day streak! +1 bonus generation" };
      } else if (newStreak === 7) {
        updates.generationsRemaining = sql`${usersTable.generationsRemaining} + 3`;
        reward = { credits: 3, message: "⚡ 7-day streak! +3 bonus generations" };
      } else if (newStreak === 30) {
        updates.generationsRemaining = sql`${usersTable.generationsRemaining} + 10`;
        reward = { credits: 10, message: "👑 30-day streak! +10 bonus generations — You're a legend!" };
      } else if (newStreak === 100) {
        updates.generationsRemaining = sql`${usersTable.generationsRemaining} + 50`;
        reward = { credits: 50, message: "🏆 100-day streak! +50 bonus generations — Hall of Fame!" };
      }
    }

    await db.update(usersTable).set(updates).where(eq(usersTable.id, userId));

    // Update challenge progress
    const [challenge] = await db.select().from(challengeParticipantsTable)
      .where(and(eq(challengeParticipantsTable.userId, userId), eq(challengeParticipantsTable.challengeId, "30-day-creator-2026")));
    
    if (challenge && !challenge.isCompleted) {
      const isFinish = challenge.completedDays + 1 >= 30;
      await db.update(challengeParticipantsTable)
        .set({ 
          completedDays: challenge.completedDays + 1,
          lastCompletedAt: new Date(),
          isCompleted: isFinish
        })
        .where(eq(challengeParticipantsTable.id, challenge.id));
    }

    db.insert(featureUsageLogsTable).values({
      id: crypto.randomUUID(),
      userId: userId,
      feature: "daily_complete"
    }).catch(() => {});

    res.json({ success: true, newStreak, reward });
  } catch (err) {
    console.error("Daily completion error:", err);
    res.status(500).json({ error: "Failed to complete daily plan" });
  }
});

router.get("/streak", requireAuth, async (req: any, res): Promise<void> => {
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.userId));
  if (!user) { res.json({ streak: 0, lastStreakDate: null }); return; }
  const streak = computeCurrentStreak(user);
  res.json({ streak, lastStreakDate: user.lastStreakDate });
});

export default router;
