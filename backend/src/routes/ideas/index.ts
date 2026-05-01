import { Router, type IRouter } from "express";
import OpenAI from "openai";
import { requireAuth, requirePlanOrTrial } from "../../middlewares/planMiddleware";

const router: IRouter = Router();

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

router.post("/ideas/generate", requireAuth, requirePlanOrTrial("ideas"), async (req: any, res): Promise<void> => {
  let isAborted = false;
  req.on('close', () => { isAborted = true; });

  const { niche = "General", goal = "grow my audience", language = "English" } = req.body;
  const sanitizedNiche = String(niche).substring(0, 50);
  const sanitizedGoal = String(goal).substring(0, 500);

  const cacheKey = `ideas:${sanitizedNiche}:${sanitizedGoal}:${language}`;
  const cached = IDEAS_CACHE.get(cacheKey);
  if (cached && (Date.now() - cached.timestamp < IDEAS_TTL)) {
    res.json(cached.data);
    return;
  }

  const nicheContext = nicheContextMap[sanitizedNiche as string] || nicheContextMap["General"];
  const painPoint = nichePainPoints[sanitizedNiche as string] || nichePainPoints["General"];
  const currentYear = new Date().getFullYear();

  // Instantiate localized OpenRouter client for Perplexity
  const openRouterClient = new OpenAI({ 
    baseURL: "https://openrouter.ai/api/v1", 
    apiKey: process.env.OPENROUTER_API_KEY 
  });

  const systemPrompt = `You are a content strategist. Search the live web for trending topics and viral patterns in the ${sanitizedNiche} space. 
Generate 10 high-performing content ideas for ${sanitizedNiche} in ${currentYear}.
NICHE: ${sanitizedNiche}
NICHE CONTEXT: ${nicheContext}
AUDIENCE PSYCHOLOGY: ${painPoint}
CREATOR GOAL: ${sanitizedGoal}.

Return ONLY a JSON object.`;

  const userPrompt = `Generate 10 ideas based on live trending data for "${sanitizedGoal}". Return ONLY a JSON object:
{
  "ideas": [
    {
      "idea": "string",
      "hook": "string",
      "angle": "string",
      "whyItWorks": "string",
      "platform": "string",
      "pattern": "string"
    }
  ]
}`;

  try {
    if (isAborted) return;
    const completion = await openRouterClient.chat.completions.create({
      model: "perplexity/sonar",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      response_format: { type: "json_object" },
      max_tokens: 2000,
    });
    
    if (isAborted) return;
    const content = completion.choices[0]?.message?.content || "{}";
    const parsed = JSON.parse(content);
    
    const responseData = { ideas: parsed.ideas ?? [] };
    IDEAS_CACHE.set(cacheKey, { data: responseData, timestamp: Date.now() });

    res.json(responseData);
  } catch (err: any) {
    if (isAborted) return;
    console.error("IDEAS GEN ERROR:", err);
    res.status(503).json({ error: "Failed to generate ideas" });
  }
});

export default router;
