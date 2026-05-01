import { Router, type IRouter } from "express";
import { openai } from "@workspace/integrations-openai-ai-server";
import { requireAuth, requirePlanOrTrial } from "../../middlewares/planMiddleware";
import { db, contentCalendarTable } from "@workspace/db";
import { LANGUAGE_INSTRUCTIONS } from "../../lib/languages";

const router: IRouter = Router();

const DAY_LABELS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

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

import { generateContent } from "../../services/ai-engine";

router.post("/strategy/generate", requireAuth, requirePlanOrTrial("strategy"), async (req: any, res): Promise<void> => {
  const { niche = "General", goal = "grow my audience and establish authority", duration = 7, language = "English" } = req.body;

  const platforms = nichePlatformWeights[niche as string] || nichePlatformWeights["General"];
  const goalContext = nicheGoalContext[niche as string] || nicheGoalContext["General"];

  const systemPrompt = `You are a senior content strategist. Create a ${duration}-day growth arc strategy for ${niche}.
CONTEXT: ${goalContext}
PLATFORMS: Primary = ${platforms.primary}, Secondary = ${platforms.secondary}.`;

  const userPrompt = `Create a ${duration}-day content strategy for: ${goal}
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

  try {
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
        contentDate.setDate(contentDate.getDate() + 1 + index);
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

    res.json({ plan: parsed.plan ?? [] });
  } catch (err: any) {
    console.error("STRATEGY GEN ERROR:", err);
    res.status(503).json({ error: "Failed to generate strategy." });
  }
});

export default router;
