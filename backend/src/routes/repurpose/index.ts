import { Router, type IRouter } from "express";
import { openai } from "@workspace/integrations-openai-ai-server";
import { requireAuth, requirePlanOrTrial } from "../../middlewares/planMiddleware";
import { LANGUAGE_INSTRUCTIONS } from "../../lib/languages";

const router: IRouter = Router();

import { generateContent } from "../../services/ai-engine";

router.post("/repurpose", requireAuth, requirePlanOrTrial("content"), async (req: any, res): Promise<void> => {
  const { content, targetFormat, language = "English" } = req.body;

  if (!content || !targetFormat) {
    res.status(400).json({ error: "Missing content or targetFormat" });
    return;
  }

  const systemPrompt = `You are a master content repurposer. Adapt the content into a ${targetFormat}.
Maintain core message and value. Format specifically for the platform.`;

  const userPrompt = `Repurpose this content into a ${targetFormat}:
"${content}"

Return ONLY a JSON object: {"repurposedContent": "string"}`;

  try {
    const rawContentObj = await generateContent({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      userPlan: req.user?.planType || "free",
      userId: req.userId,
      language,
      maxTokens: 3000,
    });

    const rawContent = rawContentObj.choices[0]?.message?.content ?? "{}";
    const jsonMatch = rawContent.match(/\{[\s\S]*\}/);
    let parsed = JSON.parse(jsonMatch ? jsonMatch[0] : rawContent);

    res.json({ result: parsed.repurposedContent });
  } catch (err: any) {
    console.error("REPURPOSE ERROR:", err);
    res.status(503).json({ error: "Failed to repurpose content." });
  }
});

export default router;
