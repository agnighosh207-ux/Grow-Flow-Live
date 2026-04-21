import { Router, type IRouter } from "express";
import { openai } from "@workspace/integrations-openai-ai-server";
import { requireAuth, requirePlanOrTrial } from "../../middlewares/planMiddleware";

const router: IRouter = Router();

const PLATFORM_CONTEXT: Record<string, string> = {
  Instagram: "Instagram caption (max 2200 chars). Uses line breaks for scanability. 3-5 relevant hashtags at end. First line must be the hook — only 1-2 lines show before 'more'. Emojis enhance personality, never overuse. CTA in last line.",
  Twitter: "Twitter/X thread or single tweet (280 chars). Punchy, fast-moving, opinionated. Every word earns its place. Hook triggers immediate engagement or controversy.",
  LinkedIn: "LinkedIn post. Professional but human. Storytelling format: setup → tension → insight → lesson. No hashtag spam (max 3). Ends with a question or clear CTA. Line breaks create breathing room.",
  YouTube: "YouTube video description (SEO-optimized). First 125 chars visible before 'more' — must hook AND include primary keyword. Timestamps if relevant. Keywords naturally woven in. End with subscribe/subscribe CTA.",
  "Blog/Article": "Blog post intro/meta description. SEO-friendly, grabs attention in first 2 sentences, makes the reader feel they MUST read on.",
  General: "Universal social media caption. Engaging, clear, conversation-starting. Focus on the emotional payoff for the reader.",
};

router.post("/caption/enhance", requireAuth, requirePlanOrTrial("caption"), async (req: any, res): Promise<void> => {
  const {
    originalCaption,
    platform = "Instagram",
    goal = "increase engagement",
    niche = "General",
    improvementFocus = "all",
  } = req.body;

  if (!originalCaption?.trim()) {
    res.status(400).json({ error: "Original caption is required" });
    return;
  }

  const platformContext = PLATFORM_CONTEXT[platform] || PLATFORM_CONTEXT["General"];

  const systemPrompt = `You are a viral content strategist who has rewritten 50,000+ captions for creators across every niche. You know exactly why certain captions stop thumbs and others get scrolled past.

Your rewrites consistently produce:
- 3-5x higher comment rates
- 40%+ improvement in saves/shares  
- Stronger brand recall after reading

The secret is that most creators write AT their audience. You write FOR them — every word serves the reader's emotional experience, not the creator's ego.

PLATFORM BEING OPTIMIZED: ${platform}
PLATFORM RULES: ${platformContext}

WHAT YOU NEVER DO:
- Start with "I" (too self-centered)
- Use vague openers like "So excited to share...", "Grateful for...", "Blessed to..."
- Write hashtag walls (unless it's specifically for Instagram Reels discovery)
- End with weak CTAs like "Let me know what you think!" 
- Use exclamation points more than once
- Copy the original structure if it's not working`;

  const userPrompt = `Analyze and enhance this ${platform} caption. The creator's goal is to ${goal} in the ${niche} niche.

ORIGINAL CAPTION:
"""
${originalCaption}
"""

IMPROVEMENT FOCUS: ${improvementFocus === "all" ? "All aspects (hook, body, CTA, formatting)" : improvementFocus}

Deliver:
1. A FULL REWRITE that dramatically outperforms the original
2. A MICRO-EDIT version (keeps 80% of original but surgically fixes the weakest parts)

Then give a brief diagnosis of what was holding the original back.

Return ONLY this JSON (no markdown, no explanation):
{
  "diagnosis": {
    "mainIssue": "The single biggest problem with the original caption (1 sentence)",
    "strengths": ["What the original did well (1-2 items)"],
    "weaknesses": ["What hurt performance (2-3 items)"]
  },
  "fullRewrite": {
    "caption": "The completely reimagined version",
    "changesMade": ["Key strategic changes made (3-4 bullets)"],
    "whyItWorks": "The psychology behind why this version will outperform (1-2 sentences)"
  },
  "microEdit": {
    "caption": "The surgically improved version (80% original)",
    "changesMade": ["Specific edits made (2-3 bullets)"]
  },
  "hookScore": {
    "original": 0,
    "rewrite": 0,
    "explanation": "Why the scores differ"
  }
}`;

  try {
    const completion = await openai.chat.completions.create({
      model: "llama-3.1-8b-instant",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      response_format: { type: "json_object" },
      temperature: 0.8,
      max_tokens: 2500,
    });

    const raw = completion.choices[0]?.message?.content ?? "{}";
    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch {
      const match = raw.match(/\{[\s\S]*\}/);
      if (match) parsed = JSON.parse(match[0]);
      else throw new Error("Failed to parse JSON from AI response.");
    }
    res.json(parsed);
  } catch (err: any) {
    console.error("Caption enhance error:", err);
    res.status(500).json({ error: err?.message || "Failed to enhance caption" });
  }
});

export default router;
