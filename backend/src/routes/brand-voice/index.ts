import { Router, type IRouter } from "express";
import { requireAuth } from "../../middlewares/planMiddleware";
import { db, brandVoicesTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { generateContent, extractJson } from "../../services/ai-engine";
import { z } from "zod";
import { nanoid } from "nanoid";

const router: IRouter = Router();

const voiceAnalysisSchema = z.object({
  tone: z.string(),
  vocabulary: z.array(z.string()),
  avoidWords: z.array(z.string()),
  emojiUsage: z.string(),
  postLength: z.string(),
  uniquePhrases: z.array(z.string()),
  aiDescription: z.string(),
});

router.post("/create", requireAuth, async (req: any, res): Promise<void> => {
  const { samplePosts, voiceName = "My Voice" } = req.body;

  if (!samplePosts || !Array.isArray(samplePosts) || samplePosts.length < 3) {
    res.status(400).json({ error: "Please provide at least 3 sample posts for analysis." });
    return;
  }

  try {
    const systemPrompt = `You are an expert linguistic profiler and brand strategist. 
    Analyze the provided sample posts to extract a highly detailed brand voice profile.
    Focus on rhythm, emotional tone, specific vocabulary choices, and signature formatting.
    Return ONLY valid JSON.`;

    const userPrompt = `
    SAMPLE POSTS:
    ${samplePosts.join("\n---\n")}

    ANALYSIS REQUIREMENTS:
    - tone: The overall emotional resonance (e.g., "authoritative but empathetic", "high-energy and punchy")
    - vocabulary: 10-15 key words or stylistic choices they use often
    - avoidWords: Common words or styles they clearly avoid
    - emojiUsage: How and when they use emojis
    - postLength: Average length (Short/Medium/Long) and structure
    - uniquePhrases: Signature openings, closings, or transition phrases
    - aiDescription: A 3-sentence summary for a prompt engineer to replicate this exact voice.

    Return JSON matching the schema.
    `;

    const response = await generateContent({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      userPlan: "INFINITY", // Use high-quality model for analysis
      userId: req.userId,
      zodSchema: voiceAnalysisSchema,
    });

    const analysis = extractJson(response.choices[0]?.message?.content || "{}");
    
    if (!analysis || !analysis.tone) {
      throw new Error("AI_ANALYSIS_FAILED");
    }

    const id = nanoid();
    await db.insert(brandVoicesTable).values({
      id,
      userId: req.userId,
      voiceName,
      samplePosts,
      ...analysis
    });

    res.json({ success: true, id, analysis });
  } catch (err) {
    console.error("Brand voice creation error:", err);
    res.status(500).json({ error: "Failed to analyze and save brand voice profile." });
  }
});

router.get("/", requireAuth, async (req: any, res): Promise<void> => {
  try {
    const voices = await db.select().from(brandVoicesTable)
      .where(eq(brandVoicesTable.userId, req.userId))
      .orderBy(desc(brandVoicesTable.createdAt));
    res.json(voices);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch brand voices." });
  }
});

export default router;
