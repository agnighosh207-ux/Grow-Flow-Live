import { Router, type IRouter } from "express";
import { requireAuth, requirePlanOrTrial } from "../../middlewares/planMiddleware";
import { enforceGenerationLimit } from "../../middlewares/generationLimiter";
import { LANGUAGE_INSTRUCTIONS } from "../../lib/languages";
import { generateContent } from "../../services/ai-engine";
import { db, contentGenerationsTable, featureUsageLogsTable } from "@workspace/db";
import crypto from "crypto";

const router: IRouter = Router();

const PLATFORM_CONTEXT: Record<string, string> = {
  Instagram: "Instagram caption (max 2200 chars). Uses line breaks for scanability. 3-5 relevant hashtags at end. First line must be the hook — only 1-2 lines show before 'more'. Emojis enhance personality, never overuse. CTA in last line.",
  Twitter: "Twitter/X thread or single tweet (280 chars). Punchy, fast-moving, opinionated. Every word earns its place. Hook triggers immediate engagement or controversy.",
  LinkedIn: "LinkedIn post. Professional but human. Storytelling format: setup → tension → insight → lesson. No hashtag spam (max 3). Ends with a question or clear CTA. Line breaks create breathing room.",
  YouTube: "YouTube video description (SEO-optimized). First 125 chars visible before 'more' — must hook AND include primary keyword. Timestamps if relevant. Keywords naturally woven in. End with subscribe/subscribe CTA.",
  "Blog/Article": "Blog post intro/meta description. SEO-friendly, grabs attention in first 2 sentences, makes the reader feel they MUST read on.",
  General: "Universal social media caption. Engaging, clear, conversation-starting. Focus on the emotional payoff for the reader.",
};

router.post("/caption/enhance", requireAuth, requirePlanOrTrial("caption"), enforceGenerationLimit, async (req: any, res): Promise<void> => {
  let isAborted = false;
  req.on('close', () => { isAborted = true; });

  const {
    originalCaption,
    platform = "Instagram",
    goal = "increase engagement",
    niche = "General",
    improvementFocus = "all",
    language = "English"
  } = req.body;

  if (!originalCaption?.trim()) {
    res.status(400).json({ error: "Original caption is required" });
    return;
  }

  const sanitizedCaption = String(originalCaption).substring(0, 3000);
  const sanitizedGoal = String(goal).substring(0, 300);
  const sanitizedNiche = String(niche).substring(0, 100);

  const platformContext = PLATFORM_CONTEXT[platform as string] || PLATFORM_CONTEXT["General"];

  const systemPrompt = `You are a viral content strategist. Optimize this ${platform} caption.
RULES: No "I", no generic openers, no exclamation spam.
CONTEXT: ${platformContext}.`;

  const userPrompt = `Analyze and enhance this caption. Goal: ${sanitizedGoal}. Niche: ${sanitizedNiche}.
ORIGINAL: "${sanitizedCaption}"
FOCUS: ${improvementFocus}

Return ONLY this JSON: {
  "diagnosis": {"mainIssue": "string", "strengths": [], "weaknesses": []},
  "fullRewrite": {"caption": "string", "changesMade": [], "whyItWorks": "string"},
  "microEdit": {"caption": "string", "changesMade": []},
  "hookScore": {"original": 0, "rewrite": 0, "explanation": "string"}
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
      maxTokens: 2500,
    });

    if (isAborted) return;
    const raw = rawContentObj.choices[0]?.message?.content ?? "{}";
    let parsed;
    try {
      const match = raw.match(/\{[\s\S]*\}/);
      parsed = JSON.parse(match ? match[0] : raw);
    } catch {
      throw new Error("Failed to parse caption response.");
    }
    // Auto-save to history
    try {
      await db.insert(contentGenerationsTable).values({
        userId: req.userId,
        idea: `Caption: ${sanitizedCaption.substring(0, 80)}...`,
        contentType: "Caption",
        tone: "Enhancement",
        content: parsed,
      });
    } catch (e) { /* non-critical */ }

    res.json(parsed);

    db.insert(featureUsageLogsTable).values({
      id: crypto.randomUUID(),
      userId: req.userId,
      feature: "caption"
    }).catch(() => {});
  } catch (err: any) {
    if (isAborted) return;
    console.error("Caption enhance error:", err);
    res.status(503).json({ error: "AI temporarily unavailable." });
  }
});

export default router;
