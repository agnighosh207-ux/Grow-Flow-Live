import { Router, type IRouter } from "express";
import { requireAuth, requirePlanOrTrial } from "../../middlewares/planMiddleware";
import { enforceGenerationLimit } from "../../middlewares/generationLimiter";
import { LANGUAGE_INSTRUCTIONS } from "../../lib/languages";
import { generateContent, extractJson } from "../../services/ai-engine";
import { db, featureUsageLogsTable } from "@workspace/db";
import crypto from "crypto";

const router: IRouter = Router();

router.post("/repurpose", requireAuth, requirePlanOrTrial("content"), enforceGenerationLimit, async (req: any, res): Promise<void> => {
  let isAborted = false;
  req.on('close', () => { isAborted = true; });

  const { content, targetFormat, language = "English" } = req.body;

  if (!content || !targetFormat) {
    res.status(400).json({ error: "Missing content or targetFormat" });
    return;
  }

  const sanitizedContent = String(content).substring(0, 4000); // Larger limit for repurposing

  const systemPrompt = `You are a master content repurposer. Adapt the content into a ${targetFormat}.
Maintain core message and value. Format specifically for the platform.`;

  const userPrompt = `Repurpose this content into a ${targetFormat}:
"${sanitizedContent}"

Return ONLY a JSON object: {"repurposedContent": "string"}`;

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
      maxTokens: 3000,
    });

    if (isAborted) return;
    const rawContent = rawContentObj.choices[0]?.message?.content ?? "{}";
    let parsed = extractJson(rawContent);

    if (!parsed || !parsed.repurposedContent) {
       // Try to use raw content if it's just a string
       const result = typeof parsed === 'string' ? parsed : (parsed?.repurposedContent || rawContent);
       res.json({ result: result.replace(/^["']|["']$/g, '') });
       return;
    }

    res.json({ result: parsed.repurposedContent });

    db.insert(featureUsageLogsTable).values({
      id: crypto.randomUUID(),
      userId: req.userId,
      feature: "repurpose"
    }).catch(() => {});
  } catch (err: any) {
    if (isAborted) return;
    console.error("REPURPOSE ERROR:", err);
    res.status(503).json({ error: "Failed to repurpose content." });
  }
});

export default router;
