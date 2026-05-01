import { Router, type IRouter } from "express";
import { requireAuth, requirePlanOrTrial } from "../../middlewares/planMiddleware";
import { LANGUAGE_INSTRUCTIONS } from "../../lib/languages";
import { generateContent } from "../../services/ai-engine";

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
  let isAborted = false;
  req.on('close', () => { isAborted = true; });

  const {
    platform = "Instagram",
    niche = "Content Creator",
    role = "",
    expertise = "",
    tone = "Professional",
    cta = "",
    achievements = "",
    language = "English"
  } = req.body;

  const sanitize = (val: any) => String(val || "").substring(0, 300);
  const sRole = sanitize(role);
  const sNiche = sanitize(niche);
  const sExpertise = sanitize(expertise);
  const sCta = sanitize(cta);
  const sAchievements = sanitize(achievements);

  const platformInfo = PLATFORM_RULES[platform as string] || PLATFORM_RULES["Instagram"];

  const systemPrompt = `Act as an elite Social Media Strategist and Copywriter. Generate 3 DISTINCT, HIGH-CONVERTING bio variations for ${platform}.
CRITICAL RULES:
1. EXTREMELY HIGH QUALITY.
2. Use modern aesthetic emojis at the BEGINNING of each line.
3. Use physical line breaks (\\n). 
4. TOTAL character count MUST be UNDER ${platformInfo.charLimit} characters.
5. VIBE: ${platformInfo.style}.`;

  const userPrompt = `Generate 3 distinct bio variations for ${platform}.
User Details:
Role: ${sRole || sNiche}
Niche: ${sNiche}
Expertise: ${sExpertise || "Top-tier strategies"}
Tone: ${tone}
CTA: ${sCta || "Click below 👇"}
Achievements: ${sAchievements}

Return ONLY a JSON object: {"platform": "${platform}", "variations": [{"label": "string", "bio": "string", "strategy": "string"}], "proTip": "string"}`;

  try {
    if (isAborted) return;
    const rawContentObj = await generateContent({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      userPlan: req.user?.planType || "free",
      userId: req.userId,
      language,
      maxTokens: 2000,
    });

    if (isAborted) return;
    const raw = rawContentObj.choices[0]?.message?.content ?? "{}";
    let parsed;
    try {
      const match = raw.match(/\{[\s\S]*\}/);
      parsed = JSON.parse(match ? match[0] : raw);
    } catch {
      throw new Error("Failed to parse bio response.");
    }

    if (parsed.variations) {
      parsed.variations = parsed.variations.map((v: any) => ({
        ...v,
        charCount: v.bio?.length ?? 0,
      }));
    }

    res.json(parsed);
  } catch (err: any) {
    if (isAborted) return;
    console.error("Bio generate error:", err);
    res.status(503).json({ error: "AI temporarily unavailable." });
  }
});

export default router;
