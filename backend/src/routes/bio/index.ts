import { Router, type IRouter } from "express";
import { requireAuth, requirePlanOrTrial } from "../../middlewares/planMiddleware";
import { enforceGenerationLimit } from "../../middlewares/generationLimiter";
import { generateContent, extractJson } from "../../services/ai-engine";

const router: IRouter = Router();

router.post("/generate", requireAuth, enforceGenerationLimit, async (req: any, res): Promise<void> => {
  const { name, niche, mainTopic, achievement, targetAudience, tone, language, formats } = req.body;

  if (!name || !formats || formats.length === 0) {
    res.status(400).json({ error: "Name and at least one format are required" });
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
  ACHIEVEMENT: ${achievement}
  TARGET AUDIENCE: ${targetAudience}
  TONE: ${tone || "Professional"}
  LANGUAGE: ${language || "English"}
  FORMATS REQUESTED: ${formats.join(", ")}

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
      userPlan: "FREE",
      userId: req.userId,
      maxTokens: 2000,
    });

    const parsed = extractJson(response.choices[0]?.message?.content || "{}");
    res.json(parsed);
  } catch (err) {
    console.error("BIO GENERATE ERROR:", err);
    await refundGenerationCredit(req.userId, req.user?.planTier);
    res.status(503).json({ error: "Profile generation service unavailable." });
  }
});

export default router;
