import { Router } from "express";
import { requireAuth, requirePlanOrTrial } from "../../middlewares/planMiddleware";
import { enforceGenerationLimit, refundGenerationCredit } from "../../middlewares/generationLimiter";
import { invalidateAuthCache } from "../../middlewares/authSyncMiddleware";
import { z } from "zod";
import { generateContent, extractJson } from "../../services/ai-engine";

const router = Router();

const AB_TEST_SCHEMA = z.object({
  idea: z.string().min(10).max(3000),
  platform: z.string(),
  niche: z.string(),
  audienceA: z.string().min(3).max(200),
  audienceB: z.string().min(3).max(200),
  tone: z.string(),
  language: z.string().optional()
});

router.post("/generate", requireAuth, requirePlanOrTrial("ab-test"), enforceGenerationLimit, async (req: any, res) => {
  try {
    const { idea, platform, niche, audienceA, audienceB, tone, language = "English" } = AB_TEST_SCHEMA.parse(req.body);

    const systemPrompt = `You are an expert A/B content tester. Create two distinct content versions for the same topic, each optimized for a different audience segment. Version A and Version B must feel genuinely different — different hooks, different angles, different psychological triggers. Then predict which will perform better and why.

Return only JSON in this exact format:
{
  "versionA": {
    "audienceTarget": "string",
    "hook": "string",
    "content": "string",
    "psychologicalTrigger": "string",
    "predictedStrength": "string"
  },
  "versionB": {
    "audienceTarget": "string",
    "hook": "string",
    "content": "string",
    "psychologicalTrigger": "string",
    "predictedStrength": "string"
  },
  "prediction": {
    "winner": "A" | "B" | "too_close",
    "confidence": number,
    "reasoning": "string",
    "keyDifference": "string"
  },
  "hybridVersion": {
    "hook": "string",
    "note": "string"
  }
}`;

    const userPrompt = `Topic/Idea: ${idea}
Platform: ${platform}
Niche: ${niche}
Tone: ${tone}

Audience A: ${audienceA}
Audience B: ${audienceB}

Generate the A/B test content.`;

    const response = await generateContent({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      userPlan: "FREE",
      language, // Fixed: Pass language to engine
      maxTokens: 2000
    });
 
    const result = extractJson(response.choices[0]?.message?.content || "{}");
    if (!result) throw new Error("Failed to parse A/B test result");
 
    res.json(result);
    invalidateAuthCache(req.userId);

  } catch (error) {
    console.error("A/B Test Error:", error);
    await refundGenerationCredit(req.userId, req.user?.planTier);
    res.status(500).json({ error: "Failed to generate A/B test" });
  }
});

export default router;
