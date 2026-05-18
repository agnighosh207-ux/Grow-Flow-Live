import { Router, type IRouter } from "express";
import { requireAuth, requirePlanOrTrial } from "../../middlewares/planMiddleware";
import { filterUserInput } from "../../lib/content-filter";
import { enforceGenerationLimit, refundGenerationCredit } from "../../middlewares/generationLimiter";
import { invalidateAuthCache } from "../../middlewares/authSyncMiddleware";
import { db, contentCalendarTable, contentGenerationsTable, featureUsageLogsTable } from "@workspace/db";
import { logger } from "../../lib/logger";
import crypto from "node:crypto";
import { generateContent, webSearch } from "../../services/ai-engine";

const router: IRouter = Router();

const nichePlatformWeights: Record<string, Record<string, string>> = {
  Fitness: { primary: "Instagram", secondary: "YouTube Shorts", strong: "TikTok" },
  Finance: { primary: "Twitter", secondary: "LinkedIn", strong: "YouTube" },
  Tech: { primary: "Twitter", secondary: "LinkedIn", strong: "YouTube Shorts" },
  Motivation: { primary: "Instagram", secondary: "Twitter", strong: "YouTube Shorts" },
  Business: { primary: "LinkedIn", secondary: "Twitter", strong: "YouTube" },
  Lifestyle: { primary: "Instagram", secondary: "YouTube Shorts", strong: "Twitter" },
  General: { primary: "Instagram", secondary: "Twitter", strong: "LinkedIn" },
};

const nicheGoalContext: Record<string, string> = {
  Fitness: "body transformation, training credibility, nutrition authority, performance metrics, mindset around discipline",
  Finance: "wealth mindset shift, specific financial moves, investment clarity, money psychology, financial freedom proof",
  Tech: "tool mastery, productivity leverage, automation wins, career growth signals, technical authority",
  Motivation: "identity transformation, habit architecture, mindset frameworks, behavior change psychology, personal story",
  Business: "revenue proof, system thinking, founder insights, marketing clarity, growth frameworks",
  Lifestyle: "intentional design, experience specificity, freedom proof, aesthetic living, contrast with default life",
  General: "value-first content, personal brand clarity, niche authority building, audience relationship deepening",
};

router.post("/generate", requireAuth, requirePlanOrTrial("strategy"), enforceGenerationLimit, async (req: any, res): Promise<void> => {
  const requestId = crypto.randomUUID().slice(0, 8);
  logger.info({ requestId, userId: req.userId, route: "strategy" }, "[AI] Request started");
  const abortController = new AbortController();
  const timeoutId = setTimeout(() => abortController.abort(), 25000);
  req.on('close', () => {
    clearTimeout(timeoutId);
    abortController.abort();
  });

  const { niche = "General", goal, duration = 7, language = "English", improvementFocus = "all" } = req.body;
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

  if (typeof goal !== "string" || goal.trim().length < 3) {
    res.status(400).json({ 
      error: "goal_required",
      message: "Please enter your content goal. Example: 'Get more Instagram followers who will buy my courses'"
    });
    return;
  }

  const filterResult = filterUserInput(goal, "goal");
  if (!filterResult.allowed) {
    res.status(400).json({ 
      error: "invalid_input",
      message: filterResult.reason || "Invalid input",
      suggestion: filterResult.suggestion || "Please provide a specific strategic goal"
    });
    return;
  }

  const sanitizedNiche = String(niche).substring(0, 50);
  const sanitizedGoal = filterResult.cleanedInput || String(goal);

  const platforms = nichePlatformWeights[sanitizedNiche] || nichePlatformWeights["General"];
  const goalContext = nicheGoalContext[sanitizedNiche] || nicheGoalContext["General"];

  try {
    // 1. Fetch live web data for RAG (Retrieval Augmented Generation)
    const liveContext = await webSearch(`${sanitizedNiche} content strategy: ${sanitizedGoal} — latest trends and viral data 2025`);
    if (abortController.signal.aborted) return;

    let systemPrompt = `You are a senior content strategist. Create a ${duration}-day growth arc strategy for ${sanitizedNiche}.
Be extremely concise and punchy. Avoid fluff. Every word must add value. 
Be concise and actionable. Avoid repetition. Use bullet points.
CONTEXT: ${goalContext}
STRATEGIC FOCUS: ${improvementFocus}
PLATFORMS: Primary = ${platforms.primary}, Secondary = ${platforms.secondary}.

=== LIVE INTERNET RESEARCH ===
Below is real-time web data regarding this topic. You MUST use these facts, trends, and statistics to ground your content. Do not invent fake data.
[CONTEXT]: ${liveContext}`;

    const userPrompt = `Create a ${duration}-day content strategy for: ${sanitizedGoal}
Return ONLY a JSON object:
{
  "plan": [
    {
      "day": 1,
      "dayLabel": "Monday",
      "platform": "LinkedIn",
      "contentType": "Educational",
      "topic": "string",
      "angle": "string",
      "hook": "string",
      "postingTime": "7-9am",
      "reasoning": "string"
    }
  ]
}`;

    const rawContentObj = await generateContent({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      userPlan: req.user?.planType || "free",
      userId: req.userId,
      language,
      maxTokens: 3500,
      forceJsonMode: true,
      signal: abortController.signal, // --- H-21 FIX: Pass AbortSignal ---
    });

    if (abortController.signal.aborted) return;

    const rawContent = rawContentObj.choices[0]?.message?.content ?? "{}";
    const jsonMatch = /\{[\s\S]*\}/.exec(rawContent);

    let parsed: any;
    try {
      parsed = JSON.parse(jsonMatch ? jsonMatch[0] : rawContent);
    } catch {
      await refundGenerationCredit(req.userId, req.user?.planTier); // --- H-19 FIX: Refund on parse failure ---
      res.status(503).json({ error: "Failed to parse strategy" });
      return;
    }


    if (parsed.plan && Array.isArray(parsed.plan) && duration === 30) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const inserts = parsed.plan.map((item: any, index: number) => {
        const contentDate = new Date(today);
        contentDate.setDate(contentDate.getDate() + index);
        return {
          userId: req.userId,
          date: contentDate,
          idea: item.topic,
          platform: item.platform,
          contentType: item.contentType || "Educational",
          status: "planned"
        };
      });
      if (inserts.length > 0) await db.insert(contentCalendarTable).values(inserts);
    }

    // Auto-save to history
    try {
      await db.insert(contentGenerationsTable).values({
        userId: req.userId,
        idea: `Strategy: ${sanitizedGoal}`,
        contentType: "Strategy",
        tone: `${duration}-day plan`,
        content: { plan: parsed.plan ?? [] },
      });
    } catch (err) {
      logger.error({ err, userId: req.userId }, "Failed to save strategy to history");
    }

    logger.info({ requestId, userId: req.userId, provider: "gemini/groq" }, "[AI] Request completed");
    res.json({ plan: parsed.plan ?? [] });
    invalidateAuthCache(req.userId);

    db.insert(featureUsageLogsTable).values({
      id: crypto.randomUUID(),
      userId: req.userId,
      feature: "strategy"
    }).catch(() => {});
  } catch (err: any) {
    if (abortController.signal.aborted) {
      if (!res.headersSent) {
        res.status(499).json({ error: "Request cancelled" });
      }
      return;
    }
    try { await refundGenerationCredit(req.userId, req.user?.planTier); } catch {}

    const isErrAborted = err?.name === 'AbortError' || err?.message === 'ABORTED';
    if (isErrAborted) {
      res.status(499).json({ error: "Request cancelled" });
      return;
    }

    const isRateLimit = err?.message?.includes('429') || err?.message?.includes('rate') || err?.message?.includes('quota');
    const isAllFailed = err?.message === 'ALL_PROVIDERS_FAILED';

    if (isRateLimit || isAllFailed) {
      logger.error({ requestId, userId: req.userId, err: err?.message }, "[AI] All providers failed or rate limited");
      res.setHeader('Retry-After', '30');
      res.status(503).json({ 
        error: "ai_overloaded",
        message: "AI providers are under high load. Your credits have not been deducted. Please retry in 30 seconds.",
        retryAfter: 30,
      });
      return;
    }

    logger.error({ requestId, userId: req.userId, err: err?.message }, "[AI] Strategy generation failed");
    res.setHeader('Retry-After', '30');
    res.status(503).json({ 
      error: "ai_overloaded",
      message: "AI is temporarily unavailable. Please try again in 30 seconds.",
      retryAfter: 30,
    });
  }
});

export default router;
