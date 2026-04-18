import { Router, type IRouter } from "express";
import { openai } from "@workspace/integrations-openai-ai-server";
import { requireAuth, requirePlanOrTrial, consumeToolTrial } from "../../middlewares/planMiddleware";

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
  Fitness: "Research-backed training myths being debunked, ozempic and GLP-1 discourse, hybrid athlete trend, zone 2 cardio revival, cold exposure science, sleep optimization, ultra-processed food debate",
  Finance: "Interest rate environment impacts, AI job displacement and income diversification, housing market reality checks, Gen Z wealth-building differently than millennials, bank failure fears, frugality vs investment debates",
  Tech: "AI replacing junior roles, vibe coding and AI agents, no-code vs low-code, remote work reversals, big tech layoffs and indie hacker rise, cursor/claude/GPT workflow wars",
  Motivation: "Dopamine detox backlash, identity-based change vs willpower-based, ADHD content creator explosion, therapy culture normalization, male mental health conversation shift",
  Business: "AI-first business models, solo founder wins, content flywheel strategies, B2B creator economy, product-led growth, agency to SaaS pivots, community as moat",
  Lifestyle: "Anti-hustle culture shift, portfolio careers, digital minimalism, work-life integration vs separation, slow living philosophy, intentional consumption",
  Fashion: "De-influencing movement, quiet luxury vs maximalism, fast fashion backlash with alternatives, AI-generated fashion concepts, vintage resale culture",
  Food: "Carnivore vs plant-based debate, seed oil controversy, glucose monitoring culture, ultra-processed food research, ancestral diet revival, food as medicine",
  Parenting: "Gentle parenting backlash, phone-free childhood movement, helicopter vs free-range, parent burnout visibility, education system questioning",
  Education: "College ROI crisis, skill-based hiring growth, micro-credential revolution, AI tutor adoption, content creator as educator",
  General: "Short-form vs long-form debate, authenticity trend, AI-generated content detection fears, creator burnout conversation, niche vs broad audience strategy",
};

router.post("/trends/generate", requireAuth, requirePlanOrTrial("trends"), async (req: any, res): Promise<void> => {
  const { niche = "General" } = req.body as { niche?: string };

  const nicheContext = nicheContextMap[niche] || nicheContextMap["General"];
  const trendDrivers = nicheTrendDrivers[niche] || nicheTrendDrivers["General"];

  const systemPrompt = `You are a social media trend intelligence analyst who tracks virality patterns across Instagram, TikTok, YouTube Shorts, Twitter, and LinkedIn. You identify content that is CURRENTLY exploding — not trends from last year.

You understand WHY content trends at the intersection of:
- Cultural moment: What people are thinking and feeling RIGHT NOW about this topic
- Platform algorithm: What content format/emotion the algorithm is currently rewarding
- Audience psychology: What specific desire, fear, or identity signal is activated

NICHE: ${niche}
CONTENT TERRITORY: ${nicheContext}
CURRENT CULTURAL DRIVERS: ${trendDrivers}

Your trend ideas must be:
- CURRENT: Reflecting real conversations happening in this niche RIGHT NOW (not evergreen best practices)
- CONTROVERSIAL ENOUGH: Takes a side, makes a point, or reveals something the audience didn't know
- SPECIFIC: Targets a specific pain point or desire, not a broad topic
- EXECUTABLE: A creator can make this TODAY, using only their expertise and a phone

NEVER output: "Share your journey", "Tips for beginners", "Motivation for the week", "Here's what I learned" (without specific substance)`;

  const userPrompt = `Generate 8 trending content ideas for a ${niche} creator that would perform exceptionally RIGHT NOW.

For each idea, think about:
1. What specific conversation is happening in ${niche} right now?
2. What angle on that conversation would create the most engagement (agreement, disagreement, or "I never thought of it that way")?
3. Which platform would the algorithm push this hardest on?

    Return ONLY a valid JSON object containing a "trends" key with an array of 8 objects:
{
  "trends": [
    {
      "title": "Scroll-stopping content title...",
      "hook": "The exact first sentence...",
      "angle": "The unique content angle...",
      "whyItWorks": "2 sentences...",
      "trendScore": 85,
      "platform": "Instagram"
    }
  ]
}

No markdown, no explanation, just the JSON object.`;

  try {
    const completion = await openai.chat.completions.create({
      model: "llama-3.1-8b-instant",
    response_format: { type: "json_object" },
      max_tokens: 3500,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    });

    const raw = completion.choices[0]?.message?.content?.trim() ?? '{"trends": []}';

    let trends: any[] = [];
    try {
      const cleaned = raw.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```\s*$/i, "").trim();
      const parsed = JSON.parse(cleaned);
      trends = Array.isArray(parsed.trends) ? parsed.trends : (Array.isArray(parsed) ? parsed : []);
    } catch {
      console.error("Failed to parse AI response. Raw text was:", raw);
      res.status(500).json({ error: "Failed to parse trend ideas" });
      return;
    }

    if (!Array.isArray(trends)) {
      res.status(500).json({ error: "Invalid trend data format" });
      return;
    }

    if (req.trialMode) await consumeToolTrial(req.userId, "trends");
    res.json({ trends, niche });
  } catch (err: any) {
    console.error("Trends AI Error:", err);
    res.status(500).json({ error: "Failed to generate trending ideas", details: err?.message });
  }
});

router.post("/content/analyze", requireAuth, requirePlanOrTrial("content_analyze"), async (req: any, res): Promise<void> => {
  const { idea, contentType = "Educational", niche = "General", platforms } = req.body as {
    idea: string;
    contentType?: string;
    niche?: string;
    platforms?: Record<string, string>;
  };

  if (!idea) {
    res.status(400).json({ error: "Missing idea" });
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
    const completion = await openai.chat.completions.create({
      model: "llama-3.1-8b-instant",
    response_format: { type: "json_object" },
      max_tokens: 800,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    });

    const raw = completion.choices[0]?.message?.content?.trim() ?? "{}";

    let analysis: any = {};
    try {
      const cleaned = raw.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```\s*$/i, "").trim();
      analysis = JSON.parse(cleaned);
    } catch {
      res.status(500).json({ error: "Failed to parse content analysis" });
      return;
    }

    if (req.trialMode) await consumeToolTrial(req.userId, "content_analyze");
    res.json(analysis);
  } catch (err) {
    res.status(500).json({ error: "Failed to analyze content" });
  }
});

export default router;
