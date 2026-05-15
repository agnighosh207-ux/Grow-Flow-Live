import { Router, type IRouter } from "express";
import { requireAuth, requirePlanOrTrial } from "../../middlewares/planMiddleware";
import { enforceGenerationLimit, refundGenerationCredit } from "../../middlewares/generationLimiter";
import { invalidateAuthCache } from "../../middlewares/authSyncMiddleware";
import { generateContent, extractJson } from "../../services/ai-engine";

const router: IRouter = Router();

router.post("/", requireAuth, enforceGenerationLimit, async (req: any, res): Promise<void> => {
  const abortController = new AbortController();
  req.on('close', () => abortController.abort());

  const { sourceContent, sourceFormat, targetFormats, tone, niche, language } = req.body;

  if (typeof sourceContent !== "string" || sourceContent.length < 50) {
    res.status(400).json({ error: "Source content must be a valid string of at least 50 characters" });
    return;
  }

  if (!Array.isArray(targetFormats) || targetFormats.length === 0 || targetFormats.length > 4) {
    res.status(400).json({ error: "Select between 1 and 4 target formats in an array" });
    return;
  }

  const sanitizedContent = sourceContent.substring(0, 3000);

  const systemPrompt = `You are a master content repurposer. Transform content from one format to another while preserving the core insight, adapting tone and structure for each platform's unique algorithm and audience behavior. Do not just summarize — fully transform the content into native-feeling platform content. Return ONLY valid JSON.`;
  
  const userPrompt = `
  SOURCE FORMAT: ${sourceFormat}
  TARGET FORMATS: ${targetFormats.join(", ")}
  TONE: ${tone || "Professional"}
  NICHE: ${niche || "General"}
  LANGUAGE: ${language || "English"}
 
  SOURCE CONTENT:
  ${sanitizedContent}
 
  Return JSON:
  {
    "repurposed": {
      "${targetFormats[0]}": {
        "content": "string",
        "platform": "string",
        "wordCount": number,
        "adaptationNote": "string"
      },
      ... // same for other formats
    },
    "coreInsight": "string",
    "repurposeStrategy": "string"
  }
  `;
 
  try {
    const isPaid = req.user?.planType !== "free";
    const response = await generateContent({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      userPlan: isPaid ? "INFINITY" : "FREE", 
      userId: req.userId,
      language, // Fixed: Pass language to engine
      maxTokens: 2500,
      forceJsonMode: true,
      signal: abortController.signal,
    });
 
    const parsed = extractJson(response.choices[0]?.message?.content || "{}");
    res.json(parsed);
    invalidateAuthCache(req.userId);
  } catch (err: any) {
    if (abortController.signal.aborted) return;
    console.error("REPURPOSE ERROR:", err);
    // --- H-19 FIX: Refund credit if repurposing fails ---
    await refundGenerationCredit(req.userId, req.user?.planTier);
    res.status(503).json({ error: "Repurposing failed. Please try again." });
  }
});

export default router;
