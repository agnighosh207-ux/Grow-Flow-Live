import { Router, type IRouter } from "express";
import { openai } from "@workspace/integrations-openai-ai-server";
import { requireAuth, requirePlanOrTrial } from "../../middlewares/planMiddleware";

const router: IRouter = Router();

const PLATFORM_RULES: Record<string, { charLimit: number; style: string; goal: string }> = {
  Instagram: {
    charLimit: 150,
    style: "Punchy, emoji-friendly, personality-driven, ends with a micro-CTA or link prompt",
    goal: "Make visitors instantly understand who you are, what you do, and why to follow",
  },
  Twitter: {
    charLimit: 160,
    style: "Witty, credential-forward, uses '|' or '·' as separators, no fluffy adjectives",
    goal: "Signal expertise and personality in one scan — makes people click Follow immediately",
  },
  LinkedIn: {
    charLimit: 220,
    style: "Results-focused, uses power verbs, quantified proof when possible, professional tone",
    goal: "Position as a credible expert — hiring managers and clients should want to connect",
  },
  YouTube: {
    charLimit: 1000,
    style: "Keyword-rich for discovery, tells what the channel does and who it's for, includes posting schedule",
    goal: "Convert visitors to subscribers by showing exactly what content they'll get and why to subscribe now",
  },
};

router.post("/bio/generate", requireAuth, requirePlanOrTrial("bio"), async (req: any, res): Promise<void> => {
  const {
    platform = "Instagram",
    niche = "Content Creator",
    role = "",
    expertise = "",
    tone = "Professional",
    cta = "",
    achievements = "",
  } = req.body;

  const platformInfo = PLATFORM_RULES[platform] || PLATFORM_RULES["Instagram"];

  const systemPrompt = `Act as an expert Social Media Strategist and SEO Copywriter. Generate 3 distinct bio variations for ${platform} based on the user's details.

Requirements for each bio:
Structure: Use a multi-line format (2-3 lines) to maximize visual space and readability.
SEO Optimization: Naturally weave in 2-3 high-traffic keywords related to their niche to improve searchability within the app.
Word Count: Strictly adhere to the platform limit (${platformInfo.charLimit} characters).
Hashtags: Include 2-3 hyper-relevant, niche-specific hashtags at the very end.

Format:
Line 1: The 'Hook' (Who you are + Authority).
Line 2: The 'Value' (What you do/solve).
Line 3: The 'Action' (CTA + Hashtags).

Platform Specifics:
Instagram: Max 150 chars. Use emojis for visual cues.
Twitter/X: Max 160 chars. Focus on punchy, high-authority statements.
LinkedIn: Max 220 chars (for headline). Focus on professional results and keywords.

Return ONLY a JSON object with this structure (no markdown, no explanation):
{
  "platform": "${platform}",
  "niche": "${niche}",
  "variations": [
    {
      "label": "SEO Focused",
      "bio": "...",
      "charCount": 0,
      "strategy": "One sentence explaining why this variation works"
    },
    {
      "label": "Authority Builder",
      "bio": "...",
      "charCount": 0,
      "strategy": "One sentence explaining why this variation works"
    },
    {
      "label": "Bold & Punchy",
      "bio": "...",
      "charCount": 0,
      "strategy": "One sentence explaining why this variation works"
    }
  ],
  "proTip": "One platform-specific SEO or strategy tip"
}`;

  const userPrompt = `Generate 3 distinct bio variations for ${platform}.

User Details:
Role: ${role || niche}
Niche: ${niche}
Expertise: ${expertise || "Not specified — infer from role and niche"}
Tone: ${tone}
CTA: ${cta || "Suggest one based on niche"}

Requirements: follow the Hook -> Value -> Action format.

Example of the "New" Output Style (for Bold tone, SaaS Founder, Tech & AI):
🚀 Building the future of AI & SaaS.
helping founders scale with Mtech-backed systems.
👇 Grab the growth roadmap here:
#SaaS #AIRevolution #TechFounder`;

  try {
    const completion = await openai.chat.completions.create({
      model: "llama-3.1-8b-instant",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      response_format: { type: "json_object" },
      temperature: 0.85,
      max_tokens: 2000,
    });

    const raw = completion.choices[0]?.message?.content ?? "{}";
    const parsed = JSON.parse(raw);

    if (parsed.variations) {
      parsed.variations = parsed.variations.map((v: any) => ({
        ...v,
        charCount: v.bio?.length ?? 0,
      }));
    }

    res.json(parsed);
  } catch (err: any) {
    console.error("Bio generate error:", err);
    res.status(500).json({ error: err?.message || "Failed to generate bio" });
  }
});

export default router;
