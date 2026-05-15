import { Router, type IRouter } from "express";
import { requireAuth, requirePlanOrTrial } from "../../middlewares/planMiddleware";
import { enforceGenerationLimit, refundGenerationCredit } from "../../middlewares/generationLimiter";
import { invalidateAuthCache } from "../../middlewares/authSyncMiddleware";
import { generateContent, extractJson } from "../../services/ai-engine";
import { db, contentGenerationsTable } from "@workspace/db";
import { eq, desc, and } from "drizzle-orm";

const router: IRouter = Router();

// Helper for required plan tier
const requireTierLevel = (tier: string) => {
    return async (req: any, res: any, next: any) => {
        const user = req.user;
        const tiers = ["FREE", "STARTER", "CREATOR", "INFINITY"];
        const userTierIndex = tiers.indexOf(user?.planTier || "FREE");
        const requiredTierIndex = tiers.indexOf(tier);
        
        if (userTierIndex < requiredTierIndex) {
            return res.status(402).json({ error: "upgrade_required", message: `This feature requires ${tier} plan.` });
        }
        next();
    };
};

router.post("/analyze", requireAuth, enforceGenerationLimit, async (req: any, res): Promise<void> => {
  const abortController = new AbortController();
  req.on('close', () => abortController.abort());

  const { competitorContent, yourNiche, platform, yourGoal, language = "English" } = req.body;

  if (typeof competitorContent !== "string" || competitorContent.length < 100) {
    res.status(400).json({ error: "Competitor content must be a valid string of at least 100 characters" });
    return;
  }

  const systemPrompt = `You are a competitive intelligence analyst for social media content creators. Analyze competitor content to extract their strategy, identify their psychological triggers, find their weaknesses, and create a superior version. Return ONLY valid JSON.`;
  
  const userPrompt = `
  COMPETITOR CONTENT:
  ${competitorContent.substring(0, 3000)}

  YOUR NICHE: ${yourNiche || "General"}
  PLATFORM: ${platform}
  YOUR GOAL: ${yourGoal || "Growth"}

  Return JSON:
  {
    "competitorStrengths": ["string"],
    "competitorWeaknesses": ["string"],
    "psychologicalTriggers": [{ "trigger": "string", "howTheyUsedIt": "string" }],
    "audienceTheyTarget": "string",
    "contentStructure": "string",
    "engagementPrediction": "string",
    "yourOpportunity": "string",
    "superiorVersion": {
      "hook": "string",
      "body": "string",
      "cta": "string",
      "whyItsBetter": "string"
    },
    "keyDifferentiator": "string"
  }
  `;

  try {
    const response = await generateContent({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      userPlan: "INFINITY", // Force high-quality model (Sonar if available)
      userId: req.userId,
      language, // Fixed: Pass language to engine
      maxTokens: 2000,
      forceJsonMode: true,
      signal: abortController.signal,
    });

    if (abortController.signal.aborted) return;

    const parsed = extractJson(response.choices[0]?.message?.content || "{}");

    // Save to history
    await db.insert(contentGenerationsTable).values({
      userId: req.userId,
      idea: "Competitor Analysis",
      contentType: "competitor_analysis",
      tone: "Analytical",
      platform: platform,
      source: "competitor",
      content: parsed
    });

    res.json(parsed);
    invalidateAuthCache(req.userId);
  } catch (err: any) {
    if (abortController.signal.aborted) return;
    console.error("COMPETITOR ANALYZE ERROR:", err);
    await refundGenerationCredit(req.userId, req.user?.planTier);
    res.status(503).json({ error: "Analysis service unavailable." });
  }
});

router.post("/batch", requireAuth, enforceGenerationLimit, requireTierLevel("CREATOR"), async (req: any, res): Promise<void> => {
  const abortController = new AbortController();
  req.on('close', () => abortController.abort());

  const { items, niche, platform, language = "English" } = req.body;
  
  if (!Array.isArray(items) || items.length > 3) {
    res.status(400).json({ error: "Max 3 items allowed for batch analysis" });
    return;
  }

  try {
    const results = await Promise.all(items.map(async (item: any) => {
      const response = await generateContent({
        messages: [
          { role: "system", content: "Analyze this competitor content briefly. Return JSON." },
          { role: "user", content: `PLATFORM: ${platform}\nNICHE: ${niche}\nCONTENT: ${item.content}\nReturn JSON with strengths, weaknesses, and a 1-sentence superior hook.` }
        ],
        userPlan: "FREE", // Use Groq for speed in batch
        userId: req.userId,
        language, // Fixed: Pass language to engine
        maxTokens: 600,
        forceJsonMode: true,
        signal: abortController.signal,
      });
      return { 
        label: item.label, 
        analysis: extractJson(response.choices[0]?.message?.content || "{}") 
      };
    }));

    if (abortController.signal.aborted) return;

    res.json(results);
    invalidateAuthCache(req.userId);
  } catch (err: any) {
    if (abortController.signal.aborted) return;
    await refundGenerationCredit(req.userId, req.user?.planTier);
    res.status(503).json({ error: "Batch analysis failed." });
  }
});

router.get("/history", requireAuth, async (req: any, res): Promise<void> => {
  try {
    const history = await db.select().from(contentGenerationsTable)
      .where(and(
        eq(contentGenerationsTable.userId, req.userId),
        eq(contentGenerationsTable.contentType, "competitor_analysis")
      ))
      .orderBy(desc(contentGenerationsTable.createdAt))
      .limit(20);
    res.json(history);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch history" });
  }
});

export default router;
