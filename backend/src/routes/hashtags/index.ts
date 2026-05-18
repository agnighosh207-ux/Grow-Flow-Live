import { Router, type IRouter } from "express";
import { requireAuth, requirePlanOrTrial } from "../../middlewares/planMiddleware";
import { enforceGenerationLimit, refundGenerationCredit } from "../../middlewares/generationLimiter";
import { invalidateAuthCache } from "../../middlewares/authSyncMiddleware";
import { logger } from "../../lib/logger";
import { generateContent, extractJson } from "../../services/ai-engine";
import { db, hashtagCollectionsTable } from "@workspace/db";
import { eq, desc, and } from "drizzle-orm";

const router: IRouter = Router();

router.post("/generate", requireAuth, requirePlanOrTrial("hashtags"), enforceGenerationLimit, async (req: any, res): Promise<void> => {
  const { topic, niche, platform, language, strategy } = req.body;

  if (!topic || !platform) {
    res.status(400).json({ error: "Topic and platform are required" });
    return;
  }

  const systemPrompt = `You are a hashtag strategist who has grown accounts to 100K+ followers. You understand the difference between hashtags that actually drive discovery vs vanity hashtags. Generate a strategic hashtag set based on the chosen strategy: growth (community hashtags with 10K-100K posts), reach (mid-tier 100K-1M), niche (under 50K highly targeted), mixed (balanced set). Return ONLY valid JSON.`;
  
  const userPrompt = `
  TOPIC: ${topic}
  NICHE: ${niche || "General"}
  PLATFORM: ${platform}
  LANGUAGE: ${language || "English"}
  STRATEGY: ${strategy || "mixed"}

  Return JSON:
  {
    "primary": [
      { "tag": "string", "category": "niche"|"community"|"broad", "estimatedPosts": "string", "competitionLevel": "low"|"medium"|"high", "relevanceScore": number }
    ],
    "secondary": [
      { "tag": "string", "category": "niche"|"community"|"broad", "estimatedPosts": "string", "competitionLevel": "low"|"medium"|"high", "relevanceScore": number }
    ],
    "avoid": [{ "tag": "string", "reason": "string" }],
    "strategyNote": "string",
    "copyableSet": "string",
    "platformNote": "string"
  }
  `;

  try {
    const response = await generateContent({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      userPlan: "FREE", // Use Groq as requested
      userId: req.userId,
      language: language || "English", // Fixed: Pass language to engine
      maxTokens: 1200,
    });

    const parsed = extractJson(response.choices[0]?.message?.content || "{}");
    res.json(parsed);
    invalidateAuthCache(req.userId);
  } catch (err: any) {
    try { await refundGenerationCredit(req.userId, req.user?.planTier); } catch {}

    const isErrAborted = err?.name === 'AbortError' || err?.message === 'ABORTED';
    if (isErrAborted) {
      res.status(499).json({ error: "Request cancelled" });
      return;
    }

    const isRateLimit = err?.message?.includes('429') || err?.message?.includes('rate') || err?.message?.includes('quota');
    const isAllFailed = err?.message === 'ALL_PROVIDERS_FAILED';

    if (isRateLimit || isAllFailed) {
      logger.error({ userId: req.userId, err: err?.message }, "[AI] All providers failed or rate limited in hashtags generate");
      res.status(503).json({ 
        error: "ai_overloaded",
        message: "AI providers are under high load. Your credits have not been deducted. Please retry in 30 seconds.",
        retryAfter: 30,
      });
      return;
    }

    logger.error({ userId: req.userId, err: err?.message }, "[AI] Hashtag generation failed");
    res.status(503).json({ error: "Hashtag service unavailable." });
  }
});

router.post("/analyze", requireAuth, requirePlanOrTrial("hashtags"), enforceGenerationLimit, async (req: any, res): Promise<void> => {
  const { hashtags, platform, niche, language = "English" } = req.body;

  if (!hashtags) {
    res.status(400).json({ error: "Hashtags are required" });
    return;
  }

  const systemPrompt = `You are a hashtag performance auditor. Analyze the provided hashtag set and grade it based on platform algorithms and niche relevance. Return ONLY valid JSON.`;
  const userPrompt = `
  HASHTAGS: ${hashtags}
  PLATFORM: ${platform}
  NICHE: ${niche || "General"}

  Return JSON:
  {
    "grade": "A"|"B"|"C"|"D"|"F",
    "gradeReason": "string",
    "issues": [{ "tag": "string", "issue": "string", "severity": "low"|"medium"|"high" }],
    "missing": ["string"],
    "recommendations": ["string"],
    "improvedSet": "string"
  }
  `;

  try {
    const response = await generateContent({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      userPlan: "FREE",
      userId: req.userId,
      language, // Fixed: Pass language to engine
      maxTokens: 1000,
    });

    const parsed = extractJson(response.choices[0]?.message?.content || "{}");
    res.json(parsed);
    invalidateAuthCache(req.userId);
  } catch (err: any) {
    try { await refundGenerationCredit(req.userId, req.user?.planTier); } catch {}

    const isErrAborted = err?.name === 'AbortError' || err?.message === 'ABORTED';
    if (isErrAborted) {
      res.status(499).json({ error: "Request cancelled" });
      return;
    }

    const isRateLimit = err?.message?.includes('429') || err?.message?.includes('rate') || err?.message?.includes('quota');
    const isAllFailed = err?.message === 'ALL_PROVIDERS_FAILED';

    if (isRateLimit || isAllFailed) {
      logger.error({ userId: req.userId, err: err?.message }, "[AI] All providers failed or rate limited in hashtags audit");
      res.status(503).json({ 
        error: "ai_overloaded",
        message: "AI providers are under high load. Your credits have not been deducted. Please retry in 30 seconds.",
        retryAfter: 30,
      });
      return;
    }

    logger.error({ userId: req.userId, err: err?.message }, "[AI] Hashtag audit failed");
    res.status(503).json({ error: "Audit service unavailable." });
  }
});

router.post("/save-collection", requireAuth, async (req: any, res): Promise<void> => {
  const { name, platform, tags } = req.body;
  if (!name || !tags) {
    res.status(400).json({ error: "Name and tags required" });
    return;
  }

  try {
    const [collection] = await db.insert(hashtagCollectionsTable).values({
      userId: req.userId,
      name,
      platform,
      tags
    }).returning();
    res.json(collection);
  } catch (err: any) {
    logger.error({ err: err?.message, userId: req.userId }, "[Hashtags] Save collection failed");
    res.status(500).json({ error: "Failed to save collection. Please try again." });
  }
});

router.get("/collections", requireAuth, async (req: any, res): Promise<void> => {
  try {
    const collections = await db.select().from(hashtagCollectionsTable)
      .where(eq(hashtagCollectionsTable.userId, req.userId))
      .orderBy(desc(hashtagCollectionsTable.createdAt));
    res.json(collections);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch collections" });
  }
});

router.delete("/collections/:id", requireAuth, async (req: any, res): Promise<void> => {
  try {
    await db.delete(hashtagCollectionsTable).where(and(
      eq(hashtagCollectionsTable.id, req.params.id),
      eq(hashtagCollectionsTable.userId, req.userId)
    ));
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete collection" });
  }
});

export default router;
