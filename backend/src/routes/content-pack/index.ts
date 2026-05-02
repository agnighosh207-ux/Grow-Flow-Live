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

    const systemPrompt = `You are an elite multi-platform content strategist. Create a complete Pro-Tier Content Kit for: "${sanitizedIdea}".
TONE: ${tone}
TYPE: ${contentType}.

=== LIVE INTERNET RESEARCH ===
Below is real-time web data regarding this topic. You MUST use these facts, trends, and statistics to ground your content. Do not invent fake data.
[CONTEXT]: ${liveContext}`;

    const userPrompt = `Generate a Content Kit for: "${sanitizedIdea}"
${!isPro ? "Generate ONLY Instagram and Twitter content." : "Generate ALL formats (Instagram, Twitter, LinkedIn, Reels)."}

Return ONLY a JSON object:
{
  "instagram": { "caption": "string", "imagePrompt": "string", "carouselSlides": ["slide1", "slide2", "slide3", "slide4", "slide5"] },
  "twitter": { "thread": ["tweet1", "tweet2", "tweet3", "tweet4", "tweet5"] },
  ${isPro ? `"linkedin": { "post": "string", "bestTimeToPost": "string" }, "reel": { "script": "string", "audioSuggestion": "string" },` : ""}
  "strategy": { "viralityScore": 92, "targetAudience": "string", "coreMessage": "string" }
}`;

    const rawContentObj = await generateContent({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      userPlan: user.planType || "free",
      userId: req.userId,
      language,
      maxTokens: isPro ? 4000 : 2000,
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
