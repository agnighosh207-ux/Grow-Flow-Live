import { Router, type IRouter } from "express";
import { openai } from "@workspace/integrations-openai-ai-server";
import { requireAuth, requirePlanOrTrial, consumeToolTrial } from "../../middlewares/planMiddleware";
import { db, contentCalendarTable } from "@workspace/db";
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

router.post("/strategy/generate", requireAuth, requirePlanOrTrial("strategy"), async (req: any, res): Promise<void> => {
  const { niche = "General", goal = "grow my audience and establish authority", duration = 7 } = req.body;

  const platforms = nichePlatformWeights[niche] || nichePlatformWeights["General"];
  const goalContext = nicheGoalContext[niche] || nicheGoalContext["General"];

  const systemPrompt = `You are a senior content strategist who has helped creators grow from 0 to 100K+ followers across every major platform. You don't create simple content calendars — you create GROWTH ARCS: carefully sequenced content where each day's content builds momentum, changes audience perception, and steadily converts casual scrollers into loyal followers.

Your strategies are built on three principles:
1. NARRATIVE COHERENCE: The ${duration} days tell a story. Day 1's content plants a seed that later content harvests.
2. ALGORITHM ALIGNMENT: Each day's format is chosen to exploit what the algorithm rewards on that specific day of the week (Tuesday and Thursday have highest professional content engagement; Wednesday and Friday drive the highest community interaction).
3. TRUST ARCHITECTURE: Educational content builds credibility → Story content builds connection → Viral content builds reach → Engagement content builds community. These must be sequenced deliberately.

WEEKLY ARC BLUEPRINT (Repeats over ${duration} days):
- Mon: Authority Anchor — establishes WHY this creator is worth following (expert insight or surprising truth)
- Tue: Personal Bridge — story that makes audience emotionally invested in the creator's journey
- Wed: Viral Grenade — the most controversial or counterintuitive thing in the niche this week
- Thu: Practical Value — step-by-step framework that makes a subscriber feel immediately smarter
- Fri: Community Ignition — engagement trigger (question, hot take, poll, or shared experience)
- Sat: Proof Point — real result, transformation, or data point with behind-the-scenes context  
- Sun: Vision Post — aspirational content that sets up next week and deepens audience identity alignment

NICHE: ${niche}
CONTENT CONTEXT: ${goalContext}
PLATFORMS: Primary = ${platforms.primary}, Secondary = ${platforms.secondary}`;

  const userPrompt = `Create a ${duration}-day content strategy for a ${niche} creator whose goal is: ${goal}

REQUIREMENTS:
- All ${duration} topics must be THEMATICALLY CONNECTED — like chapters of the same book
- Each day builds on the emotional or intellectual momentum of the previous day
- Platform choices must reflect where ${niche} content ACTUALLY performs best
- Every hook must be ready to copy-paste — not a description, the actual first line

For each day provide:
- "day": number (1 to ${duration})
- "dayLabel": day name (start from Monday and cycle through the week)
- "platform": best platform for this day's content type (Instagram / YouTube Shorts / Twitter / LinkedIn)
- "contentType": Educational / Story / Viral / Engagement
- "topic": the specific content topic (concrete and niche-specific, not vague)
- "angle": the unique frame or perspective that makes this version of the topic fresh and unmissable
- "hook": the EXACT first line/hook — ready to use, not a description (e.g., "The training mistake I made for 3 years that kept me the same size." — not "Start with a hook about a mistake")
- "postingTime": ideal posting window (e.g., "7-9am" or "6-8pm")
- "reasoning": why this specific content type, topic, and platform on this specific day in the weekly arc (reference narrative momentum)

The week must feel like a complete journey that makes the audience want to follow the creator's next move.

Return ONLY this exact JSON (no markdown, no code blocks):
{
  "plan": [
    {
      "day": 1,
      "dayLabel": "Monday",
      "platform": "LinkedIn",
      "contentType": "Educational",
      "topic": "specific topic here",
      "angle": "specific unique angle here",
      "hook": "exact ready-to-use hook line here",
      "postingTime": "7-9am",
      "reasoning": "why this works specifically on Monday in the weekly arc"
    }
  ]
}`;

  try {
    const response = await openai.chat.completions.create({
      model: "llama-3.1-8b-instant",
    response_format: { type: "json_object" },
      max_tokens: duration === 30 ? 8000 : 5000,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    });

    const rawContent = response.choices[0]?.message?.content ?? "{}";

    let parsed: any;
    try {
      parsed = JSON.parse(rawContent);
    } catch {
      const jsonMatch = rawContent.match(/\{[\s\S]*\}/);
      parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : { plan: [] };
    }

    if (req.trialMode) {
      await consumeToolTrial(req.userId, "strategy");
    }

    if (parsed.plan && Array.isArray(parsed.plan) && duration === 30) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const inserts = parsed.plan.map((item: any, index: number) => {
        const contentDate = new Date(today);
        contentDate.setDate(contentDate.getDate() + 1 + index); // start from tomorrow
        return {
          userId: req.userId,
          date: contentDate,
          idea: item.topic,
          platform: item.platform,
          contentType: item.contentType || "Educational",
          status: "planned"
        };
      });
      if (inserts.length > 0) {
        await db.insert(contentCalendarTable).values(inserts);
      }
    }

    res.json({ plan: parsed.plan ?? [] });
  } catch (err: any) {
    res.status(500).json({ error: "Failed to generate strategy. Please try again." });
  }
});

export default router;
