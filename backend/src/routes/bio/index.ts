import { Router, type IRouter } from "express";
import { requireAuth, requirePlanOrTrial } from "../../middlewares/planMiddleware";
import { enforceGenerationLimit, refundGenerationCredit } from "../../middlewares/generationLimiter";
import { invalidateAuthCache } from "../../middlewares/authSyncMiddleware";
import { generateContent, extractJson } from "../../services/ai-engine";

const router: IRouter = Router();

router.post("/generate", requireAuth, enforceGenerationLimit, async (req: any, res): Promise<void> => {
  const abortController = new AbortController();
  req.on('close', () => abortController.abort());

  const name = typeof req.body.name === "string" ? req.body.name : null;
  const niche = typeof req.body.niche === "string" ? req.body.niche : "General";
  const mainTopic = typeof req.body.mainTopic === "string" ? req.body.mainTopic : null;
  const achievement = typeof req.body.achievement === "string" ? req.body.achievement : null;
  const targetAudience = typeof req.body.targetAudience === "string" ? req.body.targetAudience : "General";
  const tone = typeof req.body.tone === "string" ? req.body.tone : "Professional";
  const language = typeof req.body.language === "string" ? req.body.language : "English";
  const formats = Array.isArray(req.body.formats) ? req.body.formats : [];
  const planType = req.user?.planType ?? "free";

  // Free users only get English
  if ((!planType || planType === "free") && language && language !== "English") {
    res.status(403).json({
      error: "language_locked",
      message: "Upgrade to Starter or higher to generate content in regional languages.",
      requiredPlan: "starter"
    });
    return;
  }

  if (!name) {
    res.status(400).json({ error: "Name is required as a string" });
    return;
  }
  if (!mainTopic) {
    res.status(400).json({ error: "Main topic is required as a string" });
    return;
  }
  if (formats.length === 0) {
    res.status(400).json({ error: "At least one format is required in an array" });
    return;
  }

  if (formats.length > 6) {
    res.status(400).json({ error: "Maximum 6 formats allowed at once" });
    return;
  }

  const systemPrompt = `You are a personal branding copywriter who has written bios for creators with 1M+ followers. Each platform has different character limits and audience expectations. Write bios that are specific, credible, and make the reader immediately understand who this person is and why they should follow. Return ONLY valid JSON.
  
  PLATFORM LIMITS:
  - Instagram: 150 chars
  - Twitter: 160 chars
  - LinkedIn: 220 chars
  - YouTube: 1000 chars
  - TikTok: 80 chars
  - link-in-bio: 200 chars`;
  
  const userPrompt = `
  NAME: ${name}
  NICHE: ${niche || "General"}
  TOPIC: ${mainTopic}
  ACHIEVEMENT: ${achievement || "None"}
  TARGET AUDIENCE: ${targetAudience || "General"}
  TONE: ${tone || "Professional"}
  LANGUAGE: ${language || "English"}
  FORMATS REQUESTED: ${Array.isArray(formats) ? formats.join(", ") : "None"}

  Return JSON where each requested format is a key:
  {
    "instagram": { "bio": "string", "charCount": number, "tip": "string" },
    "twitter": { "bio": "string", "charCount": number, "tip": "string" },
    "linkedin": { "bio": "string", "charCount": number, "tip": "string" },
    "youtube": { "bio": "string", "charCount": number, "tip": "string" },
    "tiktok": { "bio": "string", "charCount": number, "tip": "string" },
    "linkinbio": { "headline": "string", "subheadline": "string", "cta": "string" },
    "brandStatement": { "statement": "string", "oneLiner": "string" },
    "elevator30sec": { "script": "string", "wordCount": number },
    "elevator60sec": { "script": "string", "wordCount": number }
  }
  `;

  try {
    const response = await generateContent({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      userPlan: planType || "free",
      userId: req.userId,
      language: language || "English",
      maxTokens: 2000,
      forceJsonMode: true,
      signal: abortController.signal,
    });

    const parsed = extractJson(response.choices[0]?.message?.content || "{}");
    res.json(parsed);
    invalidateAuthCache(req.userId);
  } catch (err: any) {
    if (abortController.signal.aborted) return;
    console.error("BIO GENERATE ERROR:", err);
    await refundGenerationCredit(req.userId, req.user?.planTier);
    res.status(503).json({ error: "Profile generation service unavailable." });
  }
});

export default router;
