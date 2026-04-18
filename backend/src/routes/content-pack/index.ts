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

router.post("/content/pack", requireAuth, async (req: any, res): Promise<void> => {
  const { idea, tone = "Professional", contentType = "Educational" } = req.body;

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
      requiredPlan: "starter",
    });
    return;
  }

  const systemPrompt = `You are an elite multi-platform content strategist. You strictly apply expert copywriting frameworks (like AIDA, PAS, or hook-story-offer). For the SINGLE IDEA below, create a complete Pro-Tier Content Kit.

IDEA: "${idea}"
TONE: ${tone}
CONTENT TYPE: ${contentType}

PLATFORM MASTERY RULES & EXPERT DIRECTIVES:
- Instagram: 150-200 chars hook + 5-8 hashtags. Provide an AI image generation prompt for the thumbnail. Generate 5 short, punchy Carousel text slides.
- Twitter: 5-7 tweets thread using the PAS framework.
- LinkedIn: Professional post using AIDA framework, plus a strict recommendation for 'Best Time to Post'.
- Reel: 30-60s script with visual cues, plus a 'Trending Audio Suggestion' (e.g. "Fast-paced phonk", "Lofi chill beat").

${!isPro ? "Generate ONLY Instagram and Twitter content for Creator plan. Leave reel and linkedin fields completely empty." : "Generate ALL formats for Infinity plan."}

Return ONLY valid JSON with this exact structure:
{
  "instagram": { 
    "caption": "...", 
    "imagePrompt": "A highly detailed, cinematic AI image generation prompt...",
    "carouselSlides": ["slide 1 text...", "slide 2 text...", "slide 3", "slide 4", "slide 5"]
  },
  "twitter": { "thread": ["tweet 1", "tweet 2", "tweet 3", "tweet 4", "tweet 5"] },
  ${isPro ? `
  "linkedin": { "post": "...", "bestTimeToPost": "e.g. Tuesday 9:00 AM EST" },
  "reel": { "script": "...", "audioSuggestion": "..." },
  ` : ""}
  "strategy": {
    "viralityScore": 92,
    "targetAudience": "Short description of who this is for",
    "coreMessage": "The one-sentence main takeaway"
  },
  "idea": "${idea}",
  "isPro": ${isPro}
}`;

  try {
    const completion = await openai.chat.completions.create({
      model: "llama-3.1-8b-instant",
      messages: [{ role: "system", content: systemPrompt }],
      response_format: { type: "json_object" },
      temperature: 0.8,
      max_tokens: isPro ? 4000 : 1800,
    });

    const raw = completion.choices[0]?.message?.content ?? "{}";
    const parsed = JSON.parse(raw);
    res.json({ ...parsed, isPro, isCreator });
  } catch (err: any) {
    console.error("Content pack error:", err);
    res.status(500).json({ error: err?.message || "Failed to generate content pack" });
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
