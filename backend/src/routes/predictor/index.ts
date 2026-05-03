import { Router, type IRouter } from "express";
import { requireAuth, requirePlanOrTrial } from "../../middlewares/planMiddleware";
import { enforceGenerationLimit } from "../../middlewares/generationLimiter";
import { generateContent, extractJson } from "../../services/ai-engine";

const router: IRouter = Router();

router.post("/analyze", requirePlanOrTrial("predictor"), enforceGenerationLimit, async (req: any, res): Promise<void> => {
  const { content, platform, niche, contentType } = req.body;

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
      maxTokens: 1500,
    });

    const result = response.choices[0]?.message?.content || "{}";
    const parsed = extractJson(result);
    if (!parsed || typeof parsed.overallScore !== 'number') {
        res.status(503).json({ error: "Prediction analysis failed. Please try again." });
        return;
    }
    res.json(parsed);
  } catch (err: any) {
    console.error("PREDICTOR ANALYZE ERROR:", err);
    res.status(503).json({ error: "Predictor service unavailable. Please try again." });
  }
});

export default router;
