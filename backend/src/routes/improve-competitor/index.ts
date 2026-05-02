import { Router, type IRouter } from "express";
import { requireAuth, requirePlanOrTrial } from "../../middlewares/planMiddleware";
import { enforceGenerationLimit } from "../../middlewares/generationLimiter";
import { LANGUAGE_INSTRUCTIONS } from "../../lib/languages";
import { generateContent } from "../../services/ai-engine";

const router: IRouter = Router();

router.post("/improve-competitor", requireAuth, requirePlanOrTrial("improve_competitor"), enforceGenerationLimit, async (req: any, res): Promise<void> => {
  let isAborted = false;
  req.on('close', () => { isAborted = true; });

  const { competitorContent, language = "English" } = req.body;
  
  if (!competitorContent?.trim()) {
    res.status(400).json({ error: "Competitor content is required" });
    return;
  }

  const sanitizedContent = String(competitorContent).substring(0, 4000);

  const systemPrompt = `You are an elite content strategist. Outmaneuver this competitor content.
Rewrite it to be more specific, psychologically sharper, and more platform-native.`;

  const userPrompt = `Analyze and improve this content:
---
${sanitizedContent}
---

Return ONLY a JSON object:
{
  "competitorWeaknesses": ["string", "string", "string"],
  "improvedVersion": "string",
  "strongerHook": "string",
  "monetization": {
    "ctaIdeas": ["string", "string", "string"],
    "affiliateSuggestions": ["string", "string", "string"],
    "howToEarn": ["string", "string", "string"]
  }
}`;

  try {
    if (isAborted) return;
    const rawContentObj = await generateContent({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      userPlan: req.user?.planType || "free",
      userId: req.userId,
      language,
      maxTokens: 5000,
    });

    if (isAborted) return;
    const raw = rawContentObj.choices[0]?.message?.content ?? "{}";
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    let result = JSON.parse(jsonMatch ? jsonMatch[0] : raw);

    res.json(result);
  } catch (err: any) {
    if (isAborted) return;
    console.error("Improve competitor error:", err);
    res.status(503).json({ error: "AI temporarily unavailable." });
  }
});

export default router;
