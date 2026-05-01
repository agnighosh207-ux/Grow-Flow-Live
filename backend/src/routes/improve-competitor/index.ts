import { Router, type IRouter } from "express";
import { ImproveCompetitorContentBody } from "@workspace/api-zod";
import { openai } from "@workspace/integrations-openai-ai-server";
import { requireAuth, requirePlanOrTrial } from "../../middlewares/planMiddleware";
import { LANGUAGE_INSTRUCTIONS } from "../../lib/languages";

const router: IRouter = Router();

import { generateContent } from "../../services/ai-engine";

router.post("/improve-competitor", requireAuth, requirePlanOrTrial("improve_competitor"), async (req: any, res): Promise<void> => {
  const { competitorContent, language = "English" } = req.body;
  
  if (!competitorContent?.trim()) {
    res.status(400).json({ error: "Competitor content is required" });
    return;
  }

  const systemPrompt = `You are an elite content strategist. Outmaneuver this competitor content.
Rewrite it to be more specific, psychologically sharper, and more platform-native.`;

  const userPrompt = `Analyze and improve this content:
---
${competitorContent}
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

    const raw = rawContentObj.choices[0]?.message?.content ?? "{}";
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    let result = JSON.parse(jsonMatch ? jsonMatch[0] : raw);

    res.json(result);
  } catch (err: any) {
    console.error("Improve competitor error:", err);
    res.status(503).json({ error: "AI temporarily unavailable." });
  }
});

export default router;
