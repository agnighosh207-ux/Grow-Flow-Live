import { Router, type IRouter } from "express";
import { getAuth } from "@clerk/express";
import { eq } from "drizzle-orm";
import { db, usersTable } from "@workspace/db";
import { openai } from "@workspace/integrations-openai-ai-server";

const router: IRouter = Router();

const requireAuth = (req: any, res: any, next: any) => {
  const auth = getAuth(req);
  const userId = auth?.sessionClaims?.userId || auth?.userId;
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }
  req.userId = userId;
  next();
};

function isPlanEligible(user: any, requirePro: boolean): boolean {
  const status = user.subscriptionStatus;
  const plan = user.planType;
  if (!["active", "trial"].includes(status)) return false;
  if (requirePro) return plan === "infinity";
  return ["starter", "creator", "infinity"].includes(plan);
}

router.post("/content/pack/enhance", requireAuth, async (req: any, res): Promise<void> => {
  const { idea } = req.body;
  if (!idea?.trim()) { res.status(400).json({ error: "Idea is required" }); return; }

  try {
    const prompt = `You are an elite creative director. Take the following raw content idea and rewrite it into an irresistible, viral-worthy, high-converting concept. Make it punchy. Return ONLY the enhanced idea, nothing else. Maximum 2 sentences.
Raw Idea: "${idea}"`;
    const completion = await openai.chat.completions.create({
      model: "llama-3.1-8b-instant",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
      max_tokens: 150
    });
    let enhanced = completion.choices[0]?.message?.content?.trim() || idea;
    enhanced = enhanced.replace(/^["']|["']$/g, ''); // strip quotes
    res.json({ enhancedIdea: enhanced });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || "Failed to enhance idea" });
  }
});

import { generateContent } from "../../services/ai-engine";

router.post("/content/pack", requireAuth, async (req: any, res): Promise<void> => {
  const { idea, tone = "Professional", contentType = "Educational", language = "English" } = req.body;

  if (!idea?.trim()) {
    res.status(400).json({ error: "Idea is required" });
    return;
  }

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

  const systemPrompt = `You are an elite multi-platform content strategist. Create a complete Pro-Tier Content Kit for: "${idea}".
TONE: ${tone}
TYPE: ${contentType}.`;

  const userPrompt = `Generate a Content Kit for: "${idea}"
${!isPro ? "Generate ONLY Instagram and Twitter content." : "Generate ALL formats (Instagram, Twitter, LinkedIn, Reels)."}

Return ONLY a JSON object:
{
  "instagram": { "caption": "string", "imagePrompt": "string", "carouselSlides": ["slide1", "slide2", "slide3", "slide4", "slide5"] },
  "twitter": { "thread": ["tweet1", "tweet2", "tweet3", "tweet4", "tweet5"] },
  ${isPro ? `"linkedin": { "post": "string", "bestTimeToPost": "string" }, "reel": { "script": "string", "audioSuggestion": "string" },` : ""}
  "strategy": { "viralityScore": 92, "targetAudience": "string", "coreMessage": "string" }
}`;

  try {
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

    const raw = rawContentObj.choices[0]?.message?.content ?? "{}";
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    let parsed = JSON.parse(jsonMatch ? jsonMatch[0] : raw);

    res.json({ ...parsed, isPro, isCreator });
  } catch (err: any) {
    console.error("Content pack error:", err);
    res.status(503).json({ error: "AI temporarily unavailable." });
  }
});

import { contentGenerationsTable } from "@workspace/db";

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
      content: result, // This correctly handles unstructured jsonb fields for new Pro schemas!
    });
    res.json({ success: true });
  } catch (err: any) {
    console.error("Content pack save error:", err);
    res.status(500).json({ error: "Failed to save content pack to database" });
  }
});

export default router;
