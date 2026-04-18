import { Router, type IRouter } from "express";
import { openai } from "@workspace/integrations-openai-ai-server";
import { requireAuth, requirePlanOrTrial, consumeToolTrial } from "../../middlewares/planMiddleware";

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

router.post("/ideas/generate", requireAuth, requirePlanOrTrial("ideas"), async (req: any, res): Promise<void> => {
  const { niche = "General", goal = "grow my audience" } = req.body;

  const nicheContext = nicheContextMap[niche] || nicheContextMap["General"];
  const painPoint = nichePainPoints[niche] || nichePainPoints["General"];

  const systemPrompt = `You are a content strategist who has reverse-engineered why certain pieces of content get millions of views while identical content on the same topic gets ignored. You know it comes down to three things: the SPECIFICITY of the angle, the PSYCHOLOGICAL PRECISION of the hook, and whether the idea hits the audience's EXACT current pain point.

Your content ideas are used by creators who go from 0 to 100K followers because each idea:
- Targets ONE specific person in ONE specific situation (not "fitness people" — "the person who's been training for 2 years and still doesn't look like they train")
- Uses a proven content pattern but applies it in a non-obvious way to this niche
- Has a hook so good that the creator IMMEDIATELY wants to make it

NICHE: ${niche}
NICHE CONTEXT: ${nicheContext}
AUDIENCE PSYCHOLOGY: ${painPoint}
CREATOR GOAL: ${goal}

QUALITY TEST for each idea:
1. Is it specific enough that someone in the niche instantly recognizes their own situation?
2. Would someone who knows this niche think "that's a clever angle I haven't seen before"?
3. Does the hook create genuine tension or curiosity in the first 10 words?
4. Could this genuinely go viral, or is it just decent content?

If any idea fails this test, replace it with one that passes.`;

  const userPrompt = `Generate 10 high-performing content ideas for a ${niche} creator whose goal is to ${goal}.

Each idea must use a DIFFERENT content pattern and angle. Cover diverse approaches: contrarian take, personal story, framework breakdown, myth debunking, result breakdown, comparison, insider secret, controversial opinion, psychological insight, and a trend-driven angle.

For each idea provide:
- "idea": The specific content title/hook concept (concrete, max 15 words, could be a post title itself)
- "hook": The EXACT first line a creator would use — not a description of the hook, the actual hook sentence ready to use
- "angle": The unique perspective that makes this stand out from 1000 other posts on the same topic (1-2 sentences)
- "whyItWorks": The specific psychological mechanism that drives engagement — name the trigger (e.g., "Creates status anxiety by implying the reader is unknowingly behind") (2 sentences max)
- "platform": Which platform this would perform best on and why ("Instagram" | "Twitter" | "YouTube Shorts" | "LinkedIn" | "All")
- "pattern": The content pattern used (e.g., "Contrarian Opinion", "Myth Debunk", "Specific Result Breakdown", "Framework", "Story Arc", "Do This Not That", "Insider Secret", "Trend Commentary", "Identity Signal", "Comparison")

Return ONLY this exact JSON (no markdown, no code blocks):
{
  "ideas": [
    {
      "idea": "specific topic/title here",
      "hook": "the exact first line ready to use",
      "angle": "unique perspective that makes this stand out",
      "whyItWorks": "specific psychological mechanism at play",
      "platform": "best platform + brief reason",
      "pattern": "content pattern name"
    }
  ]
}`;

  // Helper to correct common typos in generated text
  const cleanText = (text: string): string => {
    const corrections: Record<string, string> = {
      'teh': 'the',
      'recieve': 'receive',
      'definately': 'definitely',
      'seperate': 'separate',
      'occured': 'occurred',
      // add more as needed
    };
    return text.replace(/\b\w+\b/g, (word) => {
      const lower = word.toLowerCase();
      return corrections[lower] ? corrections[lower] : word;
    });
  };

  // Function to sanitize all idea fields
  const sanitizeIdeas = (ideas: any[]) => {
    return ideas.map((idea) => {
      const cleaned: any = {};
      for (const key in idea) {
        if (typeof idea[key] === 'string') {
          cleaned[key] = cleanText(idea[key]);
        } else {
          cleaned[key] = idea[key];
        }
      }
      return cleaned;
    });
  };

  try {
    const response = await openai.chat.completions.create({
      model: "llama-3.1-8b-instant",
      response_format: { type: "json_object" },
      max_tokens: 5000,
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
      parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : { ideas: [] };
    }

    if (req.trialMode) {
      await consumeToolTrial(req.userId, "ideas");
    }

    const cleanedIdeas = sanitizeIdeas(parsed.ideas ?? []);
    res.json({ ideas: cleanedIdeas });
  } catch (err: any) {
    res.status(500).json({ error: "Failed to generate ideas. Please try again." });
  }
});

export default router;
