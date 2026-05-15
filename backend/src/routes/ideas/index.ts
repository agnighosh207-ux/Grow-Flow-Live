import { Router, type IRouter } from "express";
import { requireAuth, requirePlanOrTrial } from "../../middlewares/planMiddleware";
import { enforceGenerationLimit, refundGenerationCredit } from "../../middlewares/generationLimiter";
import { invalidateAuthCache } from "../../middlewares/authSyncMiddleware";
import { generateContent, webSearch, extractJson } from "../../services/ai-engine";
import { db, contentGenerationsTable, featureUsageLogsTable } from "@workspace/db";
import { logger } from "../../lib/logger";
import crypto from "node:crypto";
import { redis } from "../../lib/redis";

const router: IRouter = Router();

// ─── Direct Client Removed — Centralized via webSearch in ai-engine ──────

const nicheContextMap: Record<string, string> = {
  Fitness: "body transformation, training optimization, nutrition science, gym culture, injury prevention, performance metrics, workout psychology, recovery",
  Finance: "wealth building, investment strategies, financial independence, tax optimization, passive income streams, debt elimination, compound growth, money psychology",
  Tech: "AI tools, developer productivity, automation workflows, SaaS building, technical writing, open source, tech career growth, software architecture",
  Motivation: "behavior change, habit formation, identity transformation, cognitive psychology, peak performance, mental resilience, self-discipline, goal architecture",
  Business: "startup strategy, marketing systems, sales frameworks, team building, founder psychology, product-market fit, revenue scaling, operational leverage",
  Lifestyle: "intentional design, minimalism vs maximalism, relationship design, travel intelligence, creative living, morning/evening systems, energy management",
  General: "content creation, personal brand building, social media growth, creator monetization, audience psychology",
};

const nichePainPoints: Record<string, string> = {
  Fitness: "People are overwhelmed by conflicting advice, secretly afraid they're doing it wrong, and frustrated by plateaus they can't explain. They want to feel like they finally know the truth.",
  Finance: "People feel left behind financially, embarrassed by their money decisions, and scared of making the wrong move. They want to feel smart and in control, not stupid and reactive.",
  Tech: "Developers and builders are drowning in tool overwhelm, fighting with their own workflows, and worried they're missing the tools everyone else is using. They want an unfair advantage.",
  Motivation: "People are stuck in a loop of starting and quitting, tired of generic advice that doesn't work for them, and starting to wonder if something is wrong with them. They want to feel understood.",
  Business: "Founders and operators are grinding without traction, making decisions blindly, and watching competitors win with inferior products. They want systems that actually produce leverage.",
  Lifestyle: "People feel like they're living someone else's life, constantly busy but never fulfilled, designing their day around obligations instead of intentions. They want permission to live differently.",
  General: "Creators feel invisible despite putting in the work, unsure what content actually performs, and struggling to find their unique angle. They want clarity on what to create next.",
};

const IDEAS_CACHE = new Map<string, { data: any, timestamp: number }>();
const IDEAS_TTL = 15 * 60 * 1000; // 15 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of IDEAS_CACHE.entries()) {
    if (now - entry.timestamp > IDEAS_TTL) IDEAS_CACHE.delete(key);
  }
}, 5 * 60 * 1000); // Evict stale entries every 5 minutes

// ─── /generate — 100% PERPLEXITY SEARCH ROUTE ──────────────────────
// Perplexity sonar searches the live web AND structures JSON in ONE call.
// Groq is NOT involved here. JSON output enforced via prompt instructions.
router.post("/generate", requireAuth, requirePlanOrTrial("ideas"), enforceGenerationLimit, async (req: any, res): Promise<void> => {
  const abortController = new AbortController();
  const timeoutId = setTimeout(() => abortController.abort(), 25000);
  req.on('close', () => {
    clearTimeout(timeoutId);
    abortController.abort();
  });

  const { niche = "General", goal = "grow my audience", language = "English" } = req.body;
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
  const sanitizedNiche = String(niche).substring(0, 50);
  const sanitizedGoal = String(goal).substring(0, 500);

  const cacheKey = `ideas:${sanitizedNiche}:${sanitizedGoal}:${language}`;
  
  if (redis) {
    const cached = await redis.get(cacheKey);
    if (cached) {
      res.json(JSON.parse(cached));
      return;
    }
  } else {
    const cached = IDEAS_CACHE.get(cacheKey);
    if (cached && (Date.now() - cached.timestamp < IDEAS_TTL)) {
      res.json(cached.data);
      return;
    }
  }

  const nicheContext = nicheContextMap[sanitizedNiche] || nicheContextMap["General"];
  const painPoint = nichePainPoints[sanitizedNiche] || nichePainPoints["General"];
  const currentYear = new Date().getFullYear();

  try {
    if (abortController.signal.aborted) return;

    const liveContext = await webSearch(`Trending ${sanitizedNiche} content ideas on social media right now 2025 — viral formats, hooks, topic angles`, abortController.signal).catch(() => "");

    const finalSystemPrompt = `You are a content strategist. Search the live web for trending topics and viral patterns in the ${sanitizedNiche} space.${liveContext ? `\n\nLIVE WEB DATA:\n${liveContext}` : ""}
Generate 10 high-performing content ideas for ${sanitizedNiche} in ${currentYear}.
NICHE: ${sanitizedNiche}
NICHE CONTEXT: ${nicheContext}
AUDIENCE PSYCHOLOGY: ${painPoint}
CREATOR GOAL: ${sanitizedGoal}.
LANGUAGE: ${language}.
Output must be in ${language}.

Return ONLY a JSON object.`;

    const userPrompt = `Generate 10 ideas based on live trending data for "${sanitizedGoal}". Return ONLY a JSON object:
{
  "ideas": [
    {
      "idea": "string",
      "niche": "${sanitizedNiche}",
      "tone": "informative",
      "whyItWorks": "string",
      "platform": "Instagram" | "YouTube" | "Twitter" | "LinkedIn",
      "pattern": "string"
    }
  ]
}`;

    let ideas: any[] = [];
    const resPayload = await generateContent({
      messages: [
        { role: "system", content: finalSystemPrompt },
        { role: "user", content: userPrompt }
      ],
      userPlan: req.user?.planType || "free",
      userId: req.userId,
      language,
      maxTokens: 2500,
      forceJsonMode: true,
      signal: abortController.signal
    });

    const content = resPayload.choices[0]?.message?.content || "{}";
    const parsed = extractJson(content);
    ideas = parsed && Array.isArray(parsed.ideas) ? parsed.ideas : [];

    if (ideas.length === 0) {
      res.status(503).json({ error: "Ideas currently unavailable. Please try again." });
      return;
    }

    const responseData = { ideas };
    if (ideas && ideas.length > 0) {
      if (redis) {
        await redis.set(cacheKey, JSON.stringify(responseData), "EX", 900);
      } else {
        IDEAS_CACHE.set(cacheKey, { data: responseData, timestamp: Date.now() });
      }
    }

    // Auto-save to history
    try {
      await db.insert(contentGenerationsTable).values({
        userId: req.userId,
        idea: `Ideas: ${sanitizedGoal}`,
        contentType: "Ideas",
        tone: "AI Search",
        content: responseData,
      });
    } catch (err) {
      logger.error({ err, userId: req.userId }, "Failed to save ideas to history");
    }

    res.json(responseData);
    invalidateAuthCache(req.userId);

    await db.insert(featureUsageLogsTable).values({
      id: crypto.randomUUID(),
      userId: req.userId,
      feature: "ideas",
      action: "GENERATE_IDEAS"
    }).catch(err => logger.error({ err }, "Failed to log ideas usage"));
  } catch (err: any) {
    if (abortController.signal.aborted) return;
    console.error("IDEAS GEN ERROR:", err);
    // --- H-20 FIX: Refund credit if ideas generation fails completely ---
    await refundGenerationCredit(req.userId, req.user?.planTier);
    res.status(503).json({ error: "AI temporarily unavailable. Please try again." });
  }
});

export default router;


