import { Router, type IRouter } from "express";
import OpenAI from "openai";
import { requireAuth, requirePlanOrTrial } from "../../middlewares/planMiddleware";
import { enforceGenerationLimit } from "../../middlewares/generationLimiter";
import { generateContent, extractJson } from "../../services/ai-engine";
import { db, contentGenerationsTable, featureUsageLogsTable } from "@workspace/db";
import crypto from "crypto";
import { redis } from "../../lib/redis";

const router: IRouter = Router();

// ─── Perplexity AI Direct Client (for 100% search routes) ─────────────────
// Trends and Ideas use Perplexity DIRECTLY — it searches the live web AND
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
  Fitness: "body transformation, workout science, nutrition optimization, gym psychology, training methodologies (calisthenics, powerlifting, hypertrophy, functional), recovery protocols, biohacking",
  Finance: "personal finance, stock market investing, real estate, crypto/Web3, tax strategies, side income, FIRE movement, financial psychology, debt payoff systems",
  Tech: "AI tools and workflows, developer culture, SaaS and no-code, productivity systems, automation, cybersecurity, cloud architecture, open source",
  Motivation: "behavior change science, identity-based habits, neuroscience of discipline, peak performance, cognitive biases, mindset architecture, stoic philosophy in modern context",
  Business: "startup culture, B2B marketing, content-led growth, personal brand monetization, leadership psychology, remote work dynamics, creator economy business models",
  Lifestyle: "intentional living, aesthetic culture, digital nomad life, minimalism vs maximalism, morning routines, relationship design, slow living vs high achievement",
  Fashion: "fashion trends, styling systems, color theory, capsule wardrobes, streetwear, sustainable fashion, personal aesthetics",
  Food: "food science and nutrition myths, viral recipes, restaurant culture, food business building, dietary debates, ancestral diets vs modern nutrition",
  Parenting: "child psychology, education alternatives, conscious parenting, screen time debates, developmental milestones, parent mental health",
  Education: "online learning revolution, skill stacking, attention economy and learning, AI in education, credential alternatives",
  General: "content creation, personal brand building, creator economy, social media algorithm strategy, audience psychology",
};

const nicheTrendDrivers: Record<string, string> = {
  Fitness: "Longevity protocols replacing aesthetic goals, hyper-personalized biometric AI coaching, recovery as the primary training phase (cold plunges & red light), 'exercise snacks' and micro-workouts, hybrid fitness run clubs replacing nightlife",
  Finance: "AI-driven predictive budgeting, 'loud budgeting' replacing financial secrecy, intentional mindful spending vs 'little treats', post-inflation normalization strategies, Gen-Z wealth-building, CD ladders and stable yields returning",
  Tech: "Agentic AI executing multi-step workflows autonomously, physical AI converging with robotics, 'vibe coding' moving from hype to production, AI infrastructure costs reckoning, the rise of trusted AI governance, hybrid cloud resurgence",
  Motivation: "Neurological reset protocols, identity-shifting over discipline, micro-dosing discomfort for resilience, therapy culture backlash toward actionable stoicism, AI as an accountability partner",
  Business: "AI-first solopreneur models, hyper-personalization at scale through AI, fragmented micro-community marketing replacing mass audiences, authentic human-led counter-culture vs synthetic marketing, community as a moat",
  Lifestyle: "Digital minimalism making a massive comeback, 'living well' over 'looking good', intentional friction in daily routines, localism vs extreme digital nomadism, biological age reversal protocols",
  Fashion: "Hyper-personalized AI curation, anti-fast fashion regulation, modular capsule wardrobes, extreme quiet luxury evolving into 'stealth wealth', augmented reality try-ons",
  Food: "Food as precision medicine, hyper-local foraging tech, continuous glucose monitors moving beyond diabetics, cellular agriculture market entry, the ancestral vs highly-processed debate peaking",
  Parenting: "AI-tutor mediated screen time, smartphone-free childhood legislation impacts, hyper-local parent micro-communities, cognitive development optimization over traditional schooling",
  Education: "The complete unbundling of traditional degrees, micro-credentialing matching agentic AI job displacement, AI serving as personalized 1-on-1 tutors, experiential human-led learning resurgence",
  General: "Deep authenticity vs synthetic AI content, hyper-fragmented micro-communities, human-first storytelling, the death of mass broadcasting, highly experiential interactive content formats",
};

const TRENDS_CACHE = new Map<string, { data: any, timestamp: number }>();
const CACHE_TTL = 30 * 60 * 1000; // 30 minutes

// --- M-10 FIX: Prune in-memory cache to prevent leaks in non-Redis path ---
setInterval(() => {
  const now = Date.now();
  for (const [key, cached] of TRENDS_CACHE.entries()) {
    if (now - cached.timestamp > CACHE_TTL) {
      TRENDS_CACHE.delete(key);
    }
  }
}, 10 * 60 * 1000).unref();

// ─── /trends/generate — 100% PERPLEXITY SEARCH ROUTE ──────────────────────
// Perplexity sonar searches the live web AND structures JSON in ONE call.
// Groq is NOT involved here. JSON output enforced via prompt instructions.
router.post("/generate", requireAuth, requirePlanOrTrial("trends"), enforceGenerationLimit, async (req: any, res): Promise<void> => {
  let isAborted = false;
  req.on('close', () => { isAborted = true; });

  const { niche = "General", language = "English" } = req.body as { niche?: string; language?: string };
  const sanitizedNiche = String(niche).substring(0, 50);

  const cacheKey = `trends:${sanitizedNiche}:${language}`;
  
  if (redis) {
    const cached = await redis.get(cacheKey);
    if (cached) {
      res.json(JSON.parse(cached));
      return;
    }
  } else {
    const cached = TRENDS_CACHE.get(cacheKey);
    if (cached && (Date.now() - cached.timestamp < CACHE_TTL)) {
      res.json(cached.data);
      return;
    }
  }

  const nicheContext = nicheContextMap[sanitizedNiche] || nicheContextMap["General"];
  const trendDrivers = nicheTrendDrivers[sanitizedNiche] || nicheTrendDrivers["General"];
  const currentYear = new Date().getFullYear();

  const systemPrompt = `You are a social media trend intelligence analyst. Search the live web for breaking news and viral trends happening RIGHT NOW in the ${sanitizedNiche} space. Identify 8 content ideas that are EXPLODING in ${currentYear}. 
NICHE: ${sanitizedNiche}
CONTENT TERRITORY: ${nicheContext}
CURRENT CULTURAL DRIVERS: ${trendDrivers}
LANGUAGE: ${language}.
Output must be in ${language}.

Return ONLY a valid JSON object with a "trends" key containing an array of 8 objects. No markdown.`;

  const userPrompt = `Generate 8 trending content ideas for ${sanitizedNiche} in ${currentYear} based on live search results.
JSON schema:
{
  "trends": [
    {
      "title": "string",
      "hook": "string",
      "angle": "string",
      "whyItWorks": "string",
      "trendScore": number (70-99),
      "platform": "Instagram" | "YouTube" | "Twitter" | "LinkedIn"
    }
  ]
}`;

  try {
    if (isAborted) return;

    let trends: any[] = [];
    try {
      const completion = await perplexityClient.chat.completions.create({
        model: "perplexity/sonar",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        max_tokens: 2000,
      });

      if (isAborted) return;
      const raw = completion.choices[0]?.message?.content?.trim() ?? '{"trends": []}';
      const parsed = extractJson(raw);
      trends = parsed && Array.isArray(parsed.trends) ? parsed.trends : [];
    } catch (err: any) {
      console.warn("TRENDS DIRECT PERPLEXITY FAIL, FALLING BACK TO ENGINE:", err.message);
      const fallback = await generateContent({
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        userPlan: req.user?.planType || "free",
        userId: req.userId,
        language,
        maxTokens: 2000,
      });
      const raw = fallback.choices[0]?.message?.content?.trim() ?? '{"trends": []}';
      const parsed = extractJson(raw);
      trends = parsed && Array.isArray(parsed.trends) ? parsed.trends : [];
    }

    if (trends.length === 0) {
      res.status(503).json({ error: "Trends currently unavailable. Please try again." });
      return;
    }

    const responseData = { trends, niche: sanitizedNiche };
    if (trends && trends.length > 0) {
      if (redis) {
        await redis.set(cacheKey, JSON.stringify(responseData), "EX", 1800);
      } else {
        TRENDS_CACHE.set(cacheKey, { data: responseData, timestamp: Date.now() });
      }
    }

    // Auto-save to history
    try {
      await db.insert(contentGenerationsTable).values({
        userId: req.userId,
        idea: `Trends: ${sanitizedNiche}`,
        contentType: "Trends",
        tone: "AI Search",
        content: responseData,
      });
    } catch (e) { /* non-critical — don't block response */ }

    res.json(responseData);

    db.insert(featureUsageLogsTable).values({
      id: crypto.randomUUID(),
      userId: req.userId,
      feature: "trends"
    }).catch(() => {});
  } catch (err: any) {
    if (isAborted) return;
    console.error("TRENDS GEN ERROR:", err);
    res.status(500).json({ error: "Generation failed. Please try again." });
  }
});

export default router;


