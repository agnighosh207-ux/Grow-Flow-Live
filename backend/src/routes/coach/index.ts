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

    if (generations.length === 0) {
      res.status(400).json({ 
        error: "NO_HISTORY", 
        message: "You haven't generated any content yet! Create some posts first so the coach can analyze your style and give you advice." 
      });
      return;
    }

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
      language: user.languagePreference || "English",
      maxTokens: 1500,
    });

    const content = response.choices[0]?.message?.content || "{}";
    const parsed = extractJson(content);

    if (!parsed || typeof parsed.weeklyScore !== 'number') {
       console.error("Coach AI malformed response:", content);
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
    
    const message = err.message === "AI engine exhausted all providers." 
      ? "AI systems are currently overloaded. Please try again in a few minutes."
      : "Coach is temporarily unavailable.";
      
    res.status(503).json({ error: message });
  }
});

router.post("/chat", requireAuth, enforceGenerationLimit, async (req: any, res): Promise<void> => {
  const { message, history = [] } = req.body;
  if (!message || typeof message !== "string") {
    res.status(400).json({ error: "Message required" });
    return;
  }

  const systemPrompt = `You are GrowCoach, an expert AI content strategist for Indian social media creators. You are embedded in the GrowFlow AI app. Give specific, actionable advice. Understand Indian creator culture — Hinglish, regional content, YouTube monetization for India, brand deals with Indian companies. Keep responses concise (max 150 words). Be encouraging but honest.`;

  const chatMessages = [
    { role: "system" as const, content: systemPrompt },
    ...history.slice(-10).map((m: any) => ({ role: m.role as "user" | "assistant", content: String(m.content).slice(0, 500) })),
    { role: "user" as const, content: message.slice(0, 500) },
  ];

  try {
    const completion = await generateContent({ messages: chatMessages, maxTokens: 300, temperature: 0.7 });
    const reply = completion.choices[0]?.message?.content || "I couldn't generate a response right now. Please try again.";
    res.json({ reply });
  } catch (err: any) {
    console.error("Coach chat error:", err);
    res.status(503).json({ error: "Coach unavailable right now. Please try again in a moment." });
  }
});

export default router;
