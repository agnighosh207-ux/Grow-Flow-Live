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

  const systemPrompt = `Act as an elite Social Media Strategist and high-end Copywriter. Your goal is to generate 3 DISTINCT, HIGH-CONVERTING, and EXTREMELY IMPRESSIVE bio variations for ${platform}.

CRITICAL RULES:
1. EXTREMELY HIGH QUALITY: The bios must sound premium, authoritative, and extremely persuasive.
2. MODERN DESIRABLE EMOJIS: You MUST use relevant, modern aesthetic emojis from the latest Google Keyboard (e.g., 🤌, 🪩, 🫶, 💅, 📈, 🧠, ⚡️, 🎯, 🌱, 💸). Place exactly ONE emoji at the BEGINNING of each line.
3. STRICT MULTI-LINE STRUCTURE: You MUST use physical line breaks (\\n) to separate ideas. 
   - NEVER return a single sentence.
   - NEVER return a bio separated by pipes (|). That format is banned.
   - Line 1: [Emoji] Hook & Authority
   - Line 2: [Emoji] Value Proposition & Impact
   - Line 3: [Emoji] Direct Call-To-Action (CTA) followed by 2-3 niche hashtags.
4. ABSOLUTE HARD LIMIT: You MUST keep the TOTAL character count (including emojis and spaces) STRICTLY UNDER ${platformInfo.charLimit} characters. This is a hard technical limit. Do NOT exceed it under any circumstances, but try to use around 80% to 90% of it.
5. PLATFORM VIBE: ${platformInfo.style}. Goal: ${platformInfo.goal}.

Return ONLY a valid JSON object matching this exact structure:
{
  "platform": "${platform}",
  "niche": "${niche}",
  "variations": [
    {
      "label": "SEO & Authority",
      "bio": "First line here\\nSecond line here\\nThird line here",
      "charCount": 0,
      "strategy": "One sentence explaining why this works"
    },
    {
      "label": "Story & Connection",
      "bio": "...",
      "charCount": 0,
      "strategy": "One sentence explaining why this works"
    },
    {
      "label": "Bold & Aggressive",
      "bio": "...",
      "charCount": 0,
      "strategy": "One sentence explaining why this works"
    }
  ],
  "proTip": "One valuable platform-specific tip"
}`;

  const userPrompt = `Generate 3 completely distinct bio variations for ${platform} using the exact multi-line structure, heavy emoji usage, and premium copywriting.

User Details:
Role/Title: ${role || niche}
Niche: ${niche}
Expertise: ${expertise || "Top-tier strategies, premium results, and actionable insights"}
Tone: ${tone}
CTA: ${cta || "Click below to transform your journey 👇"}
Achievements: ${achievements}

REMEMBER: 
- Start every line with a modern aesthetic emoji (🫶, ⚡️, 🧠, etc.). 
- STRICTLY ensure the total length is UNDER ${platformInfo.charLimit} characters!
- Use physical line breaks (\\n), never pipes (|).`;

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
