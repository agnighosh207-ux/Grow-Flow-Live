import { Router, type IRouter } from "express";
import { openai } from "@workspace/integrations-openai-ai-server";
import { requireAuth, requirePlanOrTrial } from "../../middlewares/planMiddleware";
import { generateContent } from "../../services/ai-engine";

const router: IRouter = Router();

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

router.post("/trends/generate", requireAuth, requirePlanOrTrial("trends"), async (req: any, res): Promise<void> => {
  const { niche = "General" } = req.body as { niche?: string };

  // Check cache
  const cached = TRENDS_CACHE.get(niche);
  if (cached && (Date.now() - cached.timestamp < CACHE_TTL)) {
    res.json(cached.data);
    return;
  }

  const nicheContext = nicheContextMap[niche] || nicheContextMap["General"];
  const trendDrivers = nicheTrendDrivers[niche] || nicheTrendDrivers["General"];

  const currentYear = new Date().getFullYear();

  const systemPrompt = `You are a social media trend intelligence analyst. Identify 8 content ideas that are EXPLODING in ${currentYear}. 
NICHE: ${niche}
CONTENT TERRITORY: ${nicheContext}
CURRENT CULTURAL DRIVERS: ${trendDrivers}

Return ONLY a valid JSON object with a "trends" key containing an array of 8 objects. No markdown.`;

  const userPrompt = `Generate 8 trending content ideas for ${niche} in ${currentYear}.
JSON schema:
{
  "trends": [
    {
      "title": "string",
      "hook": "string",
      "angle": "string",
      "whyItWorks": "string",
      "trendScore": number,
      "platform": "string"
    }
  ]
}`;

  try {
    const completion = await generateContent({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      userPlan: req.user?.planType || "free",
      userId: req.userId,
      maxTokens: 1200,
    });

    const raw = completion.choices[0]?.message?.content?.trim() ?? '{"trends": []}';
    const jsonMatch = raw.match(/\{[\s\S]*\}/);

    let trends: any[] = [];
    try {
      const parsed = JSON.parse(jsonMatch ? jsonMatch[0] : raw);
      trends = Array.isArray(parsed.trends) ? parsed.trends : [];
    } catch {
      res.status(500).json({ error: "Failed to parse trends" });
      return;
    }

    const responseData = { trends, niche };
    
    // Save to cache
    TRENDS_CACHE.set(niche, { data: responseData, timestamp: Date.now() });

    res.json(responseData);
  } catch (err: any) {
    res.status(500).json({ error: "Generation failed" });
  }
});

router.post("/content/analyze", requireAuth, requirePlanOrTrial("content_analyze"), async (req: any, res): Promise<void> => {
  const { idea, contentType = "Educational", niche = "General", platforms } = req.body as {
    idea: string;
    contentType?: string;
    niche?: string;
    platforms?: Record<string, string>;
  };

  if (!idea || idea.trim().length < 2) {
    res.status(400).json({ error: "Please provide a valid idea to analyze." });
    return;
  }

  const contentSample = platforms
    ? Object.values(platforms).filter(Boolean).slice(0, 2).join("\n\n---\n\n").slice(0, 800)
    : "";

  const systemPrompt = `You are a viral content analyst who has studied the psychological and algorithmic patterns behind why specific content earns millions of views while nearly identical content on the same topic gets 47 likes. You don't give generic feedback — you provide surgical, specific analysis that explains EXACTLY why a piece of content will or won't perform.

Your analysis is grounded in:
- Specific psychological triggers: curiosity gap mechanics, identity activation, fear response, social proof dynamics
- Platform algorithm signals: what each platform measures (save rate for Instagram, watch time for YouTube, retweet pattern for Twitter, dwell time for LinkedIn)
- Hook science: the specific structural elements that make people read past line 1
- Niche audience psychology: what this specific audience responds to vs. what they ignore`;

  const userPrompt = `Analyze this content for performance potential with ruthless specificity:

IDEA: "${idea}"
CONTENT TYPE: ${contentType}
NICHE: ${niche}
${contentSample ? `\nSAMPLE CONTENT:\n${contentSample}` : ""}

Provide a precise analysis. Be realistic — most content scores 45-75. Reserve 85+ for content that uses a strong psychological trigger with specific proof. Reserve 90+ for content that would genuinely go viral.

Return ONLY valid JSON (no markdown):
{
  "viralityScore": 72,
  "hookStrength": 68,
  "engagementPotential": 75,
  "shareability": 60,
  "emotionalTrigger": "Specific emotion activated and WHY — name the exact psychological mechanism (e.g., 'Creates status anxiety by implying the reader is unknowingly making a costly mistake that smarter people have already fixed')",
  "curiosityGap": "Specific explanation of how it creates or satisfies curiosity — does it open a gap that forces reading? Or does it reveal something surprising? (e.g., 'Strong gap — readers know the topic but suspect they're missing something specific, which forces engagement to find out what')",
  "targetAudienceReaction": "The exact emotional and behavioral response from the target audience — what they'll think, feel, and DO (e.g., 'Fitness enthusiasts who've hit plateaus will screenshot this and show their training partner — creating both saves and shares')",
  "improvementTip": "One specific, high-impact change that would increase the virality score by 10+ points — be concrete (e.g., 'Change the hook from a generic claim to a specific number: instead of \"most people get this wrong\" use \"73% of people training for more than 1 year still make this mistake\"')"
}`;

  try {
    const completion = await generateContent({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      userPlan: req.user?.planType || "free",
      userId: req.userId,
      maxTokens: 800,
    });

    const raw = completion.choices[0]?.message?.content?.trim() ?? "{}";

    let analysis: any = {};
    try {
      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      analysis = JSON.parse(jsonMatch ? jsonMatch[0] : raw);
    } catch {
      res.status(500).json({ error: "Failed to parse content analysis" });
      return;
    }

    res.json(analysis);
  } catch (err) {
    res.status(500).json({ error: "Failed to analyze content" });
  }
});

export default router;
