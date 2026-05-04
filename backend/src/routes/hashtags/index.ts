import { Router, type IRouter } from "express";
import { requireAuth, requirePlanOrTrial } from "../../middlewares/planMiddleware";
import { enforceGenerationLimit } from "../../middlewares/generationLimiter";
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
      maxTokens: 1200,
    });

    const parsed = extractJson(response.choices[0]?.message?.content || "{}");
    res.json(parsed);
  } catch (err) {
    console.error("HASHTAG GENERATE ERROR:", err);
    await refundGenerationCredit(req.userId, req.user?.planTier);
    res.status(503).json({ error: "Hashtag service unavailable." });
  }
});

router.post("/analyze", requireAuth, enforceGenerationLimit, async (req: any, res): Promise<void> => {
  const { hashtags, platform, niche } = req.body;

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
      maxTokens: 1000,
    });

    const parsed = extractJson(response.choices[0]?.message?.content || "{}");
    res.json(parsed);
  } catch (err) {
    await refundGenerationCredit(req.userId, req.user?.planTier);
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
  } catch (err) {
    res.status(500).json({ error: "Failed to save collection" });
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
