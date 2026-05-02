import { Router, type IRouter } from "express";
import OpenAI from "openai";
import { requireAuth, requirePlanOrTrial } from "../../middlewares/planMiddleware";
import { enforceGenerationLimit } from "../../middlewares/generationLimiter";
import { extractJson } from "../../services/ai-engine";
import { db, contentGenerationsTable } from "@workspace/db";
import { redis } from "../../lib/redis";

const router: IRouter = Router();

// ─── Perplexity AI Direct Client (for 100% search routes) ─────────────────
// Ideas use Perplexity DIRECTLY — it searches the live web AND
// structures the output in a single call. NO Groq involved.
const perplexityClient = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.PERPLEXITY_AI_API,
  defaultHeaders: {
    "HTTP-Referer": "https://growflow.ai",
    "X-Title": "GrowFlow AI",
  },
});

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

// ─── /ideas/generate — 100% PERPLEXITY SEARCH ROUTE ──────────────────────
// Perplexity sonar searches the live web AND structures JSON in ONE call.
// Groq is NOT involved here. JSON output enforced via prompt instructions.
router.post("/ideas/generate", requireAuth, requirePlanOrTrial("ideas"), enforceGenerationLimit, async (req: any, res): Promise<void> => {
  let isAborted = false;
  req.on('close', () => { isAborted = true; });

  const { niche = "General", goal = "grow my audience", language = "English" } = req.body;
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

  const nicheContext = nicheContextMap[sanitizedNiche as string] || nicheContextMap["General"];
  const painPoint = nichePainPoints[sanitizedNiche as string] || nichePainPoints["General"];
  const currentYear = new Date().getFullYear();

  const systemPrompt = `You are a content strategist. Search the live web for trending topics and viral patterns in the ${sanitizedNiche} space. 
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
      "hook": "string",
      "angle": "string",
      "whyItWorks": "string",
      "platform": "Instagram" | "YouTube" | "Twitter" | "LinkedIn",
      "pattern": "string"
    }
  ]
}`;

  try {
    if (isAborted) return;

    // DIRECT Perplexity call — search + structure in ONE step
    // NOTE: Perplexity/Sonar does NOT support response_format parameter.
    // JSON output is enforced via system/user prompt instructions.
    const completion = await perplexityClient.chat.completions.create({
      model: "perplexity/sonar",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      max_tokens: 2500,
    });
    
    if (isAborted) return;
    const content = completion.choices[0]?.message?.content || "{}";
    const parsed = extractJson(content);
    
    if (!parsed || !Array.isArray(parsed.ideas) || parsed.ideas.length === 0) {
      console.error("IDEAS PARSE FAIL. Raw:", content);
      res.status(500).json({ error: "Failed to parse ideas from AI response" });
      return;
    }

    const responseData = { ideas: parsed.ideas };
    if (parsed.ideas && parsed.ideas.length > 0) {
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
    } catch (e) { /* non-critical */ }

    res.json(responseData);
  } catch (err: any) {
    if (isAborted) return;
    console.error("IDEAS GEN ERROR:", err);
    res.status(503).json({ error: "AI temporarily unavailable. Please try again." });
  }
});

export default router;


