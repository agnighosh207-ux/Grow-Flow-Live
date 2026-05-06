import { Router, type IRouter } from "express";
import { requireAuth, requirePlanOrTrial } from "../../middlewares/planMiddleware";
import { generateContent, extractJson } from "../../services/ai-engine";
import { db, contentGenerationsTable, usersTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { redis } from "../../lib/redis";

import { enforceGenerationLimit, refundGenerationCredit } from "../../middlewares/generationLimiter";
import { invalidateAuthCache } from "../../middlewares/authSyncMiddleware";

const router: IRouter = Router();

const COACH_CACHE = new Map<string, { data: any, timestamp: number }>();
const COACH_TTL = 24 * 60 * 60 * 1000; // 24 hours

router.post("/analyze", requireAuth, requirePlanOrTrial("coach"), enforceGenerationLimit, async (req: any, res): Promise<void> => {
  const userId = req.userId;

  // 1. Cache Check
  try {
    if (redis) {
      const cached = await redis.get(`coach:${userId}`);
      if (cached) {
        res.json(JSON.parse(cached));
        return;
      }
    } else {
      const cached = COACH_CACHE.get(userId);
      if (cached && (Date.now() - cached.timestamp < COACH_TTL)) {
        res.json(cached.data);
        return;
      }
    }
  } catch (err) {
    console.error("Coach cache error:", err);
  }

  try {
    // 2. Fetch Data
    const generations = await db.select()
      .from(contentGenerationsTable)
      .where(eq(contentGenerationsTable.userId, userId))
      .orderBy(desc(contentGenerationsTable.createdAt))
      .limit(30);

    const [user] = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, userId));

    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    // 3. Aggregate Data for Prompt
    const contentTypesCount: Record<string, number> = {};
    const tonesCount: Record<string, number> = {};
    generations.forEach(g => {
      if (g.contentType) contentTypesCount[g.contentType] = (contentTypesCount[g.contentType] || 0) + 1;
      if (g.tone) tonesCount[g.tone] = (tonesCount[g.tone] || 0) + 1;
    });

    const recentIdeas = generations.slice(0, 5).map(g => g.idea);
    const gensThisWeek = generations.filter(g => {
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        return g.createdAt && new Date(g.createdAt) > weekAgo;
    }).length;

    // 4. Build Prompts
    const systemPrompt = `You are a personal content growth coach. Analyze this creator's content history and give them a brutally honest, specific weekly growth report. Focus on patterns you see in their content, what is working, what is repetitive, and give 3 specific actionable tasks for this week. Be direct, not generic. Sound like a high-paid coach, not a chatbot. Return ONLY JSON.`;
    
    const userPrompt = `
CREATOR PROFILE:
- Niche: ${user.niche || "General"}
- Preferred Platform: ${user.platformPreference || "All"}
- Language: ${user.languagePreference || "English"}
- Current Streak: ${user.currentStreak} days
- Generations this week: ${gensThisWeek}
- Credits remaining: ${user.generationsRemaining}

CONTENT PATTERNS (Last 30 gens):
- Top Content Types: ${JSON.stringify(contentTypesCount)}
- Top Tones: ${JSON.stringify(tonesCount)}

RECENT IDEAS:
${recentIdeas.map((idea, i) => `${i+1}. ${idea}`).join("\n")}

Analyze the data and return a JSON object with the following structure:
{
  "weeklyScore": number (0-100),
  "topStrength": "string",
  "biggestGap": "string",
  "weeklyTasks": [
    { "task": "string", "why": "string", "platform": "string", "timeRequired": "string" }
  ],
  "contentPatterns": [
    { "pattern": "string", "observation": "string" }
  ],
  "nextWeekFocus": "string"
}
`;

    // 5. Call AI
    const isPaid = user.planType !== "free" && user.planTier !== "FREE";
    const response = await generateContent({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      userPlan: isPaid ? "INFINITY" : "FREE", 
      userId,
      maxTokens: 1500,
    });

    const content = response.choices[0]?.message?.content || "{}";
    const parsed = extractJson(content);

    if (!parsed || typeof parsed.weeklyScore !== 'number') {
       throw new Error("AI_RESPONSE_MALFORMED");
    }

    // 6. Cache & Return
    try {
      if (redis) {
        await redis.set(`coach:${userId}`, JSON.stringify(parsed), "EX", 86400); // 24h
      } else {
        COACH_CACHE.set(userId, { data: parsed, timestamp: Date.now() });
      }
    } catch (err) {
      console.error("Coach cache write error:", err);
    }

    res.json(parsed);

  } catch (err: any) {
    console.error("COACH ANALYZE ERROR:", err);
    await refundGenerationCredit(userId, req.user?.planTier);
    res.status(503).json({ error: "Coach is temporarily unavailable." });
  }
});

export default router;
