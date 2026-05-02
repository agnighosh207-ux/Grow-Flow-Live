import { Router, type IRouter } from "express";
import { requireAuth, requirePlanOrTrial } from "../../middlewares/planMiddleware";
import { enforceGenerationLimit } from "../../middlewares/generationLimiter";
import { db, contentCalendarTable, contentGenerationsTable, featureUsageLogsTable } from "@workspace/db";
import crypto from "crypto";
import { generateContent } from "../../services/ai-engine";
import { fetchLiveContext } from "../../services/perplexity-search";

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

router.post("/strategy/generate", requireAuth, requirePlanOrTrial("strategy"), enforceGenerationLimit, async (req: any, res): Promise<void> => {
  let isAborted = false;
  req.on('close', () => { isAborted = true; });

  const { niche = "General", goal = "grow my audience and establish authority", duration = 7, language = "English", improvementFocus = "all" } = req.body;
  const sanitizedNiche = String(niche).substring(0, 50);
  const sanitizedGoal = String(goal).substring(0, 500);

  const platforms = nichePlatformWeights[sanitizedNiche as string] || nichePlatformWeights["General"];
  const goalContext = nicheGoalContext[sanitizedNiche as string] || nicheGoalContext["General"];

  try {
    // 1. Fetch live web data for RAG (Retrieval Augmented Generation)
    const liveContext = await fetchLiveContext(sanitizedNiche as string, sanitizedGoal as string);
    if (isAborted) return;

    let systemPrompt = `You are a senior content strategist. Create a ${duration}-day growth arc strategy for ${sanitizedNiche}.
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
      maxTokens: duration === 30 ? 8000 : 5000,
    });

    if (isAborted) return;

    const rawContent = rawContentObj.choices[0]?.message?.content ?? "{}";
    const jsonMatch = rawContent.match(/\{[\s\S]*\}/);

    let parsed: any;
    try {
      parsed = JSON.parse(jsonMatch ? jsonMatch[0] : rawContent);
    } catch {
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
    } catch (e) { /* non-critical */ }

    res.json({ plan: parsed.plan ?? [] });

    db.insert(featureUsageLogsTable).values({
      id: crypto.randomUUID(),
      userId: req.userId,
      feature: "strategy"
    }).catch(() => {});
  } catch (err: any) {
    if (isAborted) return;
    console.error("STRATEGY GEN ERROR:", err);
    res.status(503).json({ error: "Failed to generate strategy." });
  }
});

export default router;
