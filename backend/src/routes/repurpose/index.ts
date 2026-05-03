import { Router, type IRouter } from "express";
import { requireAuth, requirePlanOrTrial } from "../../middlewares/planMiddleware";
import { enforceGenerationLimit } from "../../middlewares/generationLimiter";
import { generateContent, extractJson } from "../../services/ai-engine";

const router: IRouter = Router();

router.post("/", requireAuth, enforceGenerationLimit, async (req: any, res): Promise<void> => {
  const { sourceContent, sourceFormat, targetFormats, tone, niche, language } = req.body;

  if (!sourceContent || sourceContent.length < 50) {
    res.status(400).json({ error: "Source content must be at least 50 characters" });
    return;
  }

  if (!Array.isArray(targetFormats) || targetFormats.length === 0 || targetFormats.length > 4) {
    res.status(400).json({ error: "Select between 1 and 4 target formats" });
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
      maxTokens: 2500,
    });

    const parsed = extractJson(response.choices[0]?.message?.content || "{}");
    res.json(parsed);
  } catch (err) {
    console.error("REPURPOSE ERROR:", err);
    res.status(503).json({ error: "Repurposing failed. Please try again." });
  }
});

export default router;
