import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, usersTable, contentGenerationsTable } from "@workspace/db";
import { requireAuth } from "../../middlewares/planMiddleware";
import { enforceGenerationLimit } from "../../middlewares/generationLimiter";
import { generateContent, extractJson } from "../../services/ai-engine";
import { fetchLiveContext } from "../../services/perplexity-search";

const router: IRouter = Router();

router.post("/content/pack/enhance", requireAuth, async (req: any, res): Promise<void> => {
  const { idea } = req.body;
  if (!idea?.trim()) { res.status(400).json({ error: "Idea is required" }); return; }
  const sanitizedIdea = String(idea).substring(0, 500);

  try {
    const prompt = `You are an elite creative director. Take the following raw content idea and rewrite it into an irresistible, viral-worthy, high-converting concept. Make it punchy. Return ONLY the enhanced idea, nothing else. Maximum 2 sentences.
Raw Idea: "${sanitizedIdea}"`;
    const completion = await generateContent({
      messages: [{ role: "user", content: prompt }],
      userPlan: req.user?.planType || "free",
      userId: req.userId,
      maxTokens: 150
    });
    let raw = completion.choices[0]?.message?.content?.trim() || sanitizedIdea;
    let parsed = extractJson(raw);
    let enhanced = parsed?.enhancedIdea || raw;
    enhanced = enhanced.replace(/^["']|["']$/g, ''); // strip quotes
    res.json({ enhancedIdea: enhanced });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || "Failed to enhance idea" });
  }
});

router.post("/content/pack", requireAuth, enforceGenerationLimit, async (req: any, res): Promise<void> => {
  let isAborted = false;
  req.on('close', () => { isAborted = true; });

  const { idea, tone = "Professional", contentType = "Educational", language = "English", niche = "General" } = req.body;

  if (!idea?.trim()) {
    res.status(400).json({ error: "Idea is required" });
    return;
  }
  const sanitizedIdea = String(idea).substring(0, 500);
  const sanitizedNiche = String(niche).substring(0, 50);

  try {
    // 1. Fetch live web data for RAG (Retrieval Augmented Generation)
    const liveContext = await fetchLiveContext(sanitizedNiche, sanitizedIdea);
    if (isAborted) return;

    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.userId));
    if (!user) { res.status(404).json({ error: "User not found" }); return; }

    const isPro = user.subscriptionStatus === "active" && user.planType === "infinity";
    const isCreator = ["active", "trial"].includes(user.subscriptionStatus) && ["starter", "creator", "infinity"].includes(user.planType);

    if (!isCreator) {
      res.status(402).json({
        error: "upgrade_required",
        message: "Multi-Content Pack is available on Creator plan and above.",
      });
      return;
    }

    const systemPrompt = `You are a world-class Content Architect and Growth Strategist for an elite digital marketing agency. Your mission is to transform a simple idea into a high-authority content ecosystem that dominates the market.
You MUST integrate the provided [LIVE RESEARCH] to ensure the content is factually accurate, trend-aligned, and deeply relevant.

[CORE MISSION]:
- Market Analysis: Provide deep, actionable insights into WHY this content will go viral now.
- Content Quality: Use cinematic storytelling, psychological hooks, and high-conversion structures.
- Tone: Strictly adhere to the requested tone (${tone}).
- No Fluff: Avoid generic advice. Be specific to the idea: "${sanitizedIdea}".

[LIVE RESEARCH DATA]:
${liveContext}`;

    const userPrompt = `Generate an Elite Content Ecosystem for the idea: "${sanitizedIdea}"
Target Niche: ${sanitizedNiche}
Language: ${language}

Return ONLY a strictly valid JSON object. Do NOT include any markdown formatting or prefix/suffix.
JSON Structure:
{
  "marketAnalysis": {
    "whyThisWorksNow": "Analyze why this specific topic is trending or valuable in 2026 based on the research.",
    "targetAudiencePsychology": "What emotional state is the audience in when they see this? What is their hidden desire?",
    "competitorGap": "What is everyone else missing about this topic that we are capturing?",
    "painPointAddressed": "The specific, deep-seated frustration this content solves."
  },
  "instagram": {
    "caption": "Deep, high-conversion caption (200-300 words) with professional spacing and hooks.",
    "storyStrategy": ["Slide 1 Hook", "Slide 2 Value", "Slide 3 CTA"],
    "visualDirection": "A professional Midjourney v6 prompt to create a stunning, high-end cover image for this post.",
    "carouselSlides": ["Slide 1: Hook", "Slide 2: Context", "Slide 3: Step 1", "Slide 4: Step 2", "Slide 5: Step 3", "Slide 6: Transformation", "Slide 7: CTA"]
  },
  "twitter": {
    "viralHooks": ["Variation 1 (Controversial)", "Variation 2 (Value-driven)", "Variation 3 (Story-based)"],
    "thread": ["Tweet 1: Viral Hook", "Tweet 2: The Stakes", "Tweet 3: The Solution", "Tweet 4: Data/Evidence", "Tweet 5: The Lesson", "Tweet 6: CTA"]
  },
  ${isPro ? `"linkedin": { "post": "Long-form authority post (400 words) with professional formatting.", "authorityHook": "One-line hook that stops the scroll." }, "reel": { "script": "Cinematic script with [Visual Description], [Voiceover], and [On-Screen Text].", "pacingNotes": "How should the cuts be timed? (e.g., Fast cuts to beat, slow pans)", "trendingAudioDirection": "What type of audio/music mood fits this?" },` : ""}
  "discovery": {
    "socialSEOKeywords": ["keyword1", "keyword2", "keyword3", "keyword4", "keyword5"],
    "viralHashtags": ["#tag1", "#tag2", "#tag3", "#tag4", "#tag5"]
  },
  "strategy": {
    "viralityScore": 95,
    "distributionPlan": "Specific strategy to promote this across 3 platforms for maximum reach.",
    "coreMessage": "The one 'Golden Nugget' or breakthrough realization of this entire kit."
  }
}`;

    const rawContentObj = await generateContent({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      userPlan: user.planType || "free",
      userId: req.userId,
      language,
      maxTokens: isPro ? 4000 : 2500,
    });

    if (isAborted) return;

    const raw = rawContentObj.choices[0]?.message?.content ?? "{}";
    let parsed = extractJson(raw);

    if (!parsed) {
      throw new Error("MALFORMED_AI_RESPONSE");
    }

    res.json({ ...parsed, isPro, isCreator });
  } catch (err: any) {
    if (isAborted) return;
    console.error("Content pack error:", err);
    res.status(503).json({ error: "AI temporarily unavailable." });
  }
});

router.post("/content/pack/save", requireAuth, async (req: any, res): Promise<void> => {
  const { idea, tone, contentType, result } = req.body;
  if (!idea || !result) {
    res.status(400).json({ error: "Missing required data to save pack" });
    return;
  }
  try {
    await db.insert(contentGenerationsTable).values({
      userId: req.userId,
      idea,
      tone: tone || "Professional",
      contentType: contentType || "Pack",
      content: result,
    });
    res.json({ success: true });
  } catch (err: any) {
    console.error("Content pack save error:", err);
    res.status(500).json({ error: "Failed to save content pack to database" });
  }
});

export default router;
