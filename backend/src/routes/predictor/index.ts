import { Router, type IRouter } from "express";
import { requireAuth, requirePlanOrTrial } from "../../middlewares/planMiddleware";
import { enforceGenerationLimit, refundGenerationCredit } from "../../middlewares/generationLimiter";
import { generateContent, extractJson } from "../../services/ai-engine";
import { db, predictorResultsTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { invalidateAuthCache } from "../../middlewares/authSyncMiddleware";
import { logger } from "../../lib/logger";

const router: IRouter = Router();

router.post("/analyze", requireAuth, requirePlanOrTrial("predictor"), enforceGenerationLimit, async (req: any, res): Promise<void> => {
  const abortController = new AbortController();
  req.on('close', () => abortController.abort());

  const { content, platform, niche, contentType, language = "English" } = req.body;

  if (typeof content !== "string" || content.length < 50) {
    res.status(400).json({ error: "Content must be a valid string of at least 50 characters" });
    return;
  }
  if (typeof platform !== "string" || !["Instagram", "Twitter", "LinkedIn", "YouTube"].includes(platform)) {
    res.status(400).json({ error: "Invalid or missing platform string" });
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
    return;
  } catch (err: any) {
    if (abortController.signal.aborted) {
      if (!res.headersSent) {
        res.status(499).json({ error: "Request cancelled" });
      }
      return;
    }
    try { await refundGenerationCredit(req.userId, req.user?.planTier); } catch {}

    const isErrAborted = err?.name === 'AbortError' || err?.message === 'ABORTED';
    if (isErrAborted) {
      res.status(499).json({ error: "Request cancelled" });
      return;
    }

    const isRateLimit = err?.message?.includes('429') || err?.message?.includes('rate') || err?.message?.includes('quota');
    const isAllFailed = err?.message === 'ALL_PROVIDERS_FAILED';

    if (isRateLimit || isAllFailed) {
      logger.error({ userId: req.userId, err: err?.message }, "[AI] All providers failed or rate limited");
      res.status(503).json({ 
        error: "ai_overloaded",
        message: "AI providers are under high load. Your credits have not been deducted. Please retry in 30 seconds.",
        retryAfter: 30,
      });
      return;
    }

    logger.error({ userId: req.userId, err: err?.message }, "[AI] Predictor analysis failed");
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
    return;
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch history" });
    return;
  }
});

export default router;
