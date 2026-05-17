import { Router, type IRouter } from "express";
import { requireAuth, requirePlanOrTrial } from "../../middlewares/planMiddleware";
import { filterUserInput } from "../../lib/content-filter";
import { enforceGenerationLimit, refundGenerationCredit } from "../../middlewares/generationLimiter";
import { invalidateAuthCache } from "../../middlewares/authSyncMiddleware";
import { logger } from "../../lib/logger";
import { generateContent } from "../../services/ai-engine";
import { db, contentGenerationsTable, featureUsageLogsTable } from "@workspace/db";
import crypto from "node:crypto";

const router: IRouter = Router();

const PLATFORM_CONTEXT: Record<string, string> = {
  Instagram: "Instagram caption (max 2200 chars). Uses line breaks for scanability. 3-5 relevant hashtags at end. First line must be the hook — only 1-2 lines show before 'more'. Emojis enhance personality, never overuse. CTA in last line.",
  Twitter: "Twitter/X thread or single tweet (280 chars). Punchy, fast-moving, opinionated. Every word earns its place. Hook triggers immediate engagement or controversy.",
  LinkedIn: "LinkedIn post. Professional but human. Storytelling format: setup → tension → insight → lesson. No hashtag spam (max 3). Ends with a question or clear CTA. Line breaks create breathing room.",
  YouTube: "YouTube video description (SEO-optimized). First 125 chars visible before 'more' — must hook AND include primary keyword. Timestamps if relevant. Keywords naturally woven in. End with subscribe/subscribe CTA.",
  "Blog/Article": "Blog post intro/meta description. SEO-friendly, grabs attention in first 2 sentences, makes the reader feel they MUST read on.",
  General: "Universal social media caption. Engaging, clear, conversation-starting. Focus on the emotional payoff for the reader.",
};

router.post("/enhance", requireAuth, requirePlanOrTrial("caption"), enforceGenerationLimit, async (req: any, res): Promise<void> => {
  const abortController = new AbortController();
  req.on('close', () => abortController.abort());

  const {
    originalCaption,
    platform = "Instagram",
    goal = "increase engagement",
    niche = "General",
    improvementFocus = "all",
    language = "English"
  } = req.body;

  if (typeof originalCaption !== "string") {
    res.status(400).json({
      error: "invalid_input",
      message: "originalCaption must be a string."
    });
    return;
  }

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

  const filterResult = filterUserInput(originalCaption, "originalCaption");
  if (!filterResult.allowed) {
    res.status(400).json({ 
      error: "invalid_input",
      message: filterResult.reason || "Invalid input",
      suggestion: filterResult.suggestion || "Please provide a specific caption draft to enhance"
    });
    return;
  }

  const sanitizedCaption = filterResult.cleanedInput || originalCaption;
  const sanitizedGoal = (typeof goal === "string" ? goal : "increase engagement").substring(0, 300);
  const sanitizedNiche = (typeof niche === "string" ? niche : "General").substring(0, 100);

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
    if (abortController.signal.aborted) return;
    const rawContentObj = await generateContent({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      userPlan: req.user?.planType || "free",
      userId: req.userId,
      language,
      maxTokens: 2500,
      forceJsonMode: true,
      signal: abortController.signal, // --- H-21 FIX: Pass AbortSignal ---
    });

    if (abortController.signal.aborted) return;
    const raw = rawContentObj.choices[0]?.message?.content ?? "{}";
    let parsed;
    try {
      const match = /\{[\s\S]*\}/.exec(raw);
      parsed = JSON.parse(match ? match[0] : raw);
    } catch {
      await refundGenerationCredit(req.userId, req.user?.planTier); // --- H-19 FIX: Refund on parse failure ---
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
    } catch (e) {
      logger.warn({ err: String(e) }, "Failed to auto-save caption generation history");
    }

    res.json(parsed);
    invalidateAuthCache(req.userId);

    db.insert(featureUsageLogsTable).values({
      id: crypto.randomUUID(),
      userId: req.userId,
      feature: "caption"
    }).catch(() => {});
  } catch (err: any) {
    if (abortController.signal.aborted) return;
    console.error("Caption enhance error:", err);
    // --- H-19 FIX: Refund credit if caption enhancement fails ---
    await refundGenerationCredit(req.userId, req.user?.planTier);
    res.status(503).json({ error: "AI temporarily unavailable." });
  }
});

export default router;
