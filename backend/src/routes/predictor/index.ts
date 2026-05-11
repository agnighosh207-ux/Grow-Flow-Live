import { Router, type IRouter } from "express";
import { requireAuth, requirePlanOrTrial } from "../../middlewares/planMiddleware";
import { enforceGenerationLimit, refundGenerationCredit } from "../../middlewares/generationLimiter";
import { generateContent, extractJson } from "../../services/ai-engine";
import { db, predictorResultsTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";

const router: IRouter = Router();

router.post("/analyze", requireAuth, requirePlanOrTrial("predictor"), enforceGenerationLimit, async (req: any, res): Promise<void> => {
  const abortController = new AbortController();
  req.on('close', () => abortController.abort());

  const { content, platform, niche, contentType, language = "English" } = req.body;

  if (!content || content.length < 50) {
    res.status(400).json({ error: "Content must be at least 50 characters" });
    return;
  }
  if (!["Instagram", "Twitter", "LinkedIn", "YouTube"].includes(platform)) {
    res.status(400).json({ error: "Invalid platform" });
    return;
  }

  const sanitizedContent = content.substring(0, 2000);

  const systemPrompt = `You are a social media algorithm expert and content performance analyst. You have studied thousands of viral posts and understand exactly what the algorithms reward on each platform. Analyze the provided content and give a detailed, honest prediction of its performance. Be specific and brutal — no vague advice. Cite exact reasons with reference to algorithm behavior. Return ONLY valid JSON.`;
  
  const userPrompt = `
PLATFORM: ${platform}
NICHE: ${niche || "General"}
TYPE: ${contentType || "General"}
CONTENT:
${sanitizedContent}

Return JSON:
{
  "overallScore": number (0-100),
  "algorithmScore": number (0-100),
  "hookScore": number (0-100),
  "retentionScore": number (0-100),
  "ctaScore": number (0-100),
  "verdict": "High Performer" | "Average" | "Needs Work" | "Will Underperform",
  "verdictReason": "string (one sentence)",
  "algorithmSignals": [{ "signal": "string", "impact": "positive"|"negative"|"neutral", "explanation": "string" }],
  "hookAnalysis": { "strength": "string", "issue": "string | null", "improvedVersion": "string" },
  "retentionPoints": [{ "moment": "string", "risk": "string" }],
  "topFix": "string",
  "improvedVersion": "string",
  "platformSpecificTips": ["string"]
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
      maxTokens: 1500,
      signal: abortController.signal,
    });

    const result = response.choices[0]?.message?.content || "{}";
    const parsed = extractJson(result);
    if (!parsed || typeof parsed.overallScore !== 'number') {
        res.status(503).json({ error: "Prediction analysis failed. Please try again." });
        return;
    }
    res.json(parsed);
    
    // Persistence
    db.insert(predictorResultsTable).values({
      userId: req.userId,
      content: content.substring(0, 500),
      platform: platform,
      niche: niche || "General",
      overallScore: parsed.overallScore,
      algorithmScore: parsed.algorithmScore || 0,
      hookScore: parsed.hookScore,
      verdict: parsed.verdict,
      topFix: parsed.topFix,
    }).catch((e) => console.error("Failed to save predictor result:", e));

    invalidateAuthCache(req.userId);
  } catch (err: any) {
    console.error("PREDICTOR ANALYZE ERROR:", err);
    await refundGenerationCredit(req.userId, req.user?.planTier);
    res.status(503).json({ error: "Predictor service unavailable. Please try again." });
  }
});

router.get("/history", requireAuth, async (req: any, res): Promise<void> => {
  try {
    const history = await db.select().from(predictorResultsTable)
      .where(eq(predictorResultsTable.userId, req.userId))
      .orderBy(desc(predictorResultsTable.createdAt))
      .limit(50);
    res.json(history);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch history" });
  }
});

export default router;
