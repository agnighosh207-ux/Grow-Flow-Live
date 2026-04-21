import { Router, type IRouter } from "express";
import { getAuth } from "@clerk/express";
import { eq, and } from "drizzle-orm";
import { db, usersTable, dailyPlansTable } from "@workspace/db";
import { openai } from "@workspace/integrations-openai-ai-server";

const router: IRouter = Router();

const requireAuth = (req: any, res: any, next: any) => {
  const auth = getAuth(req);
  const userId = auth?.sessionClaims?.userId || auth?.userId;
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }
  req.userId = userId;
  next();
};

function getTodayDate(): string {
  return new Date().toISOString().slice(0, 10);
}

function getYesterdayDate(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10);
}

function daysBetween(dateA: string, dateB: string): number {
  const a = new Date(dateA);
  const b = new Date(dateB);
  return Math.round(Math.abs(a.getTime() - b.getTime()) / (1000 * 60 * 60 * 24));
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

async function generateDailyPlanContent(userId: string): Promise<{ idea: string; hook: string; cta: string }> {
  const systemPrompt = `You are a daily content strategist who gives creators ONE focused, achievable action each day. Your daily plans are:
- Specific enough to execute in under 2 hours
- Calibrated for an engaged creator audience
- Different every day (rotate topics, formats, angles)
- Written so the creator can immediately start working

Return ONLY valid JSON with this exact structure:
{
  "idea": "The specific content idea (one punchy sentence, like a video/post title)",
  "hook": "The exact opening line to start this piece of content (ready to use, no editing needed)",
  "cta": "The call-to-action to end this content piece (specific, action-oriented, one sentence)"
}`;

  const userPrompt = `Generate today's growth action for a content creator. Pick a content format and angle that would perform well today. Make it concrete, specific, and immediately actionable. The idea should be post-ready.`;

  const completion = await openai.chat.completions.create({
    model: "llama-3.1-8b-instant",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    response_format: { type: "json_object" },
    temperature: 0.9,
    max_tokens: 400,
  });

  const raw = completion.choices[0]?.message?.content ?? "{}";
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    const match = raw.match(/\{[\s\S]*\}/);
    if (match) parsed = JSON.parse(match[0]);
    else throw new Error("Failed to parse JSON from AI response.");
  }
  return {
    idea: parsed.idea || "Share 3 lessons from your biggest failure this year",
    hook: parsed.hook || "I failed publicly and it was the best thing that ever happened to me.",
    cta: parsed.cta || "Comment 'LESSON' and I'll share the full story with you.",
  };
}

router.get("/daily/today", requireAuth, async (req: any, res): Promise<void> => {
  const today = getTodayDate();
  const userId = req.userId;

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
  if (!user) { res.status(404).json({ error: "User not found" }); return; }

  const currentStreak = computeCurrentStreak(user);

  let [existing] = await db.select().from(dailyPlansTable)
    .where(and(eq(dailyPlansTable.userId, userId), eq(dailyPlansTable.date, today)));

  if (!existing) {
    try {
      const content = await generateDailyPlanContent(userId);
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

  res.json({
    plan: existing,
    streak: currentStreak,
    completedToday: !!existing?.completedAt,
  });
});

router.post("/daily/complete", requireAuth, async (req: any, res): Promise<void> => {
  const today = getTodayDate();
  const userId = req.userId;

  const [plan] = await db.select().from(dailyPlansTable)
    .where(and(eq(dailyPlansTable.userId, userId), eq(dailyPlansTable.date, today)));

  if (!plan) { res.status(404).json({ error: "No plan for today" }); return; }
  if (plan.completedAt) { res.json({ streak: computeCurrentStreak(await db.select().from(usersTable).where(eq(usersTable.id, userId)).then(r => r[0])), alreadyCompleted: true }); return; }

  await db.update(dailyPlansTable).set({ completedAt: new Date() })
    .where(and(eq(dailyPlansTable.userId, userId), eq(dailyPlansTable.date, today)));

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
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

  await db.update(usersTable).set({ currentStreak: newStreak, lastStreakDate: today })
    .where(eq(usersTable.id, userId));

  res.json({ streak: newStreak, completedToday: true });
});

router.get("/daily/streak", requireAuth, async (req: any, res): Promise<void> => {
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.userId));
  if (!user) { res.json({ streak: 0, lastStreakDate: null }); return; }
  const streak = computeCurrentStreak(user);
  res.json({ streak, lastStreakDate: user.lastStreakDate });
});

export default router;
