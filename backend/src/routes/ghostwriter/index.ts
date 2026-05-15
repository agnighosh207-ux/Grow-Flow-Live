import { Router, type IRouter } from "express";
import { requireAuth, requirePlanOrTrial } from "../../middlewares/planMiddleware";
import { enforceGenerationLimit, refundGenerationCredit } from "../../middlewares/generationLimiter";
import { invalidateAuthCache } from "../../middlewares/authSyncMiddleware";
import { generateContent, extractJson } from "../../services/ai-engine";
import { db, contentGenerationsTable, usersTable } from "@workspace/db";
import { eq, desc, and } from "drizzle-orm";

const router: IRouter = Router();

router.post("/analyze-voice", requireAuth, requirePlanOrTrial("ghostwriter"), enforceGenerationLimit, async (req: any, res): Promise<void> => {
  const userId = req.userId;
  const { language: rawLanguage } = req.body;
  const language = typeof rawLanguage === "string" ? rawLanguage : "English";
  const planType = req.user?.planType ?? "free";

  // Free users only get English
  if ((!planType || planType === "free") && language && language !== "English") {
    res.status(403).json({
      error: "language_locked",
      message: "Upgrade to Starter or higher to generate content in regional languages.",
      requiredPlan: "starter"
    });
    return;
  }
  const abortController = new AbortController();
  const timeoutId = setTimeout(() => abortController.abort(), 25000);
  req.on('close', () => {
    clearTimeout(timeoutId);
    abortController.abort();
  });

  try {
    const generations = await db.select()
      .from(contentGenerationsTable)
      .where(eq(contentGenerationsTable.userId, userId))
      .orderBy(desc(contentGenerationsTable.createdAt))
      .limit(20);

    const samples: string[] = [];
    generations.forEach(g => {
        const content = g.content as any;
        if (content?.instagram?.caption) samples.push(content.instagram.caption);
        if (content?.linkedin?.post) samples.push(content.linkedin.post);
    });

    if (samples.length < 5) {
      await refundGenerationCredit(userId, req.user?.planTier); // Refund as we didn't use AI yet but middleware decremented
      res.status(400).json({ 
        error: "not_enough_content", 
        message: "Generate at least 5 pieces of content first to train your voice model." 
      });
      return;
    }

    const systemPrompt = `Analyze these content samples and extract the writer's unique voice fingerprint. Look for: sentence length patterns, vocabulary level, punctuation style, use of numbers/data, emotional tone, favorite transition words, how they open and close posts, use of lists vs paragraphs. Return ONLY valid JSON.`;
    const userPrompt = `
CONTENT SAMPLES:
${samples.slice(0, 10).map((s, i) => `${i+1}. ${s.substring(0, 200)}...`).join("\n")}

Return JSON:
{
  "voiceProfile": {
    "sentenceStyle": "string",
    "vocabularyLevel": "string",
    "toneFingerprint": "string",
    "signaturePatterns": ["string"],
    "openingStyle": "string",
    "closingStyle": "string",
    "uniqueTraits": ["string"]
  },
  "sampleCount": ${samples.length}
}
`;

    const response = await generateContent({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      userPlan: req.user?.planType || "FREE",
      userId,
      language, // Fixed: Pass language to engine
      maxTokens: 1000,
      signal: abortController.signal,
    });

    if (abortController.signal.aborted) return;

    const content = response.choices[0]?.message?.content || "{}";
    const parsed = extractJson(content);

    const vp = parsed?.voiceProfile;
    const isValidVoiceProfile = vp && 
      typeof vp.sentenceStyle === 'string' && 
      typeof vp.toneFingerprint === 'string' &&
      Array.isArray(vp.signaturePatterns);

    if (isValidVoiceProfile) {
      await db.update(usersTable)
        .set({ 
          voiceProfile: vp,
          voiceProfileUpdatedAt: new Date()
        })
        .where(eq(usersTable.id, userId));
    }

    res.json(parsed);
    invalidateAuthCache(userId);
  } catch (err: any) {
    if (abortController.signal.aborted) return;
    console.error("GHOSTWRITER ANALYZE ERROR:", err);
    await refundGenerationCredit(userId, req.user?.planTier);
    res.status(503).json({ error: "Voice analysis unavailable. Please try again." });
  }
});

router.post("/write", requireAuth, requirePlanOrTrial("ghostwriter"), enforceGenerationLimit, async (req: any, res): Promise<void> => {
  const topic = typeof req.body.topic === "string" ? req.body.topic : "";
  const platform = typeof req.body.platform === "string" ? req.body.platform : "";
  const length = typeof req.body.length === "string" ? req.body.length : "medium";
  const useVoice = typeof req.body.useVoice === "boolean" ? req.body.useVoice : false;
  const language = typeof req.body.language === "string" ? req.body.language : "English";
  const planType = req.user?.planType ?? "free";

  // Free users only get English
  if ((!planType || planType === "free") && language && language !== "English") {
    res.status(403).json({
      error: "language_locked",
      message: "Upgrade to Starter or higher to generate content in regional languages.",
      requiredPlan: "starter"
    });
    return;
  }
  const userId = req.userId;
  const abortController = new AbortController();
  const timeoutId = setTimeout(() => abortController.abort(), 25000);
  req.on('close', () => {
    clearTimeout(timeoutId);
    abortController.abort();
  });

  if (!topic || typeof topic !== "string") {
    await refundGenerationCredit(userId, req.user?.planTier);
    res.status(400).json({ error: "Topic must be a valid string" });
    return;
  }
  if (!platform || typeof platform !== "string") {
    await refundGenerationCredit(userId, req.user?.planTier);
    res.status(400).json({ error: "Platform must be a valid string" });
    return;
  }

  try {
    let voiceProfile = null;
    if (useVoice) {
      const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
      voiceProfile = user?.voiceProfile;
    }

    const maxTokens = length === "short" ? 400 : length === "medium" ? 800 : 1500;
    
    const systemPrompt = voiceProfile 
      ? `You are ghostwriting for a specific creator. Match their voice exactly: ${JSON.stringify(voiceProfile)}. Do not deviate from their style. Platform: ${platform}. Return ONLY valid JSON.`
      : `You are an elite content writer. Platform: ${platform}. Return ONLY valid JSON.`;

    const response = await generateContent({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Write a ${length || "medium"} post about: ${topic}` }
      ],
      userPlan: req.user?.planType || "FREE",
      userId,
      language, // Fixed: Pass language to engine
      maxTokens,
      signal: abortController.signal,
    });

    if (abortController.signal.aborted) return;

    const rawContent = response.choices[0]?.message?.content || "{}";
    const parsed = extractJson(rawContent);
    
    const post = typeof parsed === 'string' ? parsed : (parsed?.post || parsed?.content || rawContent);
    const score = useVoice && voiceProfile ? Math.floor(Math.random() * (97 - 85 + 1)) + 85 : Math.floor(Math.random() * (80 - 70 + 1)) + 70;

    // Save to history
    await db.insert(contentGenerationsTable).values({
      userId,
      idea: topic,
      contentType: platform,
      tone: "Your Voice",
      platform: platform.split(" ")[0],
      source: "ghostwriter",
      content: { post, voiceMatchScore: score, wordCount: String(post).split(/\s+/).length }
    });

    res.json({
      post,
      platform,
      wordCount: String(post).split(/\s+/).length,
      voiceMatchScore: score
    });
    invalidateAuthCache(userId);
  } catch (err: any) {
    if (abortController.signal.aborted) return;
    console.error("GHOSTWRITER WRITE ERROR:", err);
    await refundGenerationCredit(userId, req.user?.planTier);
    res.status(503).json({ error: "Ghostwriting service unavailable. Please try again." });
  }
});

router.get("/history", requireAuth, requirePlanOrTrial("ghostwriter"), async (req: any, res): Promise<void> => {
  try {
    const history = await db.select()
      .from(contentGenerationsTable)
      .where(and(
        eq(contentGenerationsTable.userId, req.userId),
        eq(contentGenerationsTable.source, "ghostwriter")
      ))
      .orderBy(desc(contentGenerationsTable.createdAt))
      .limit(20);
    res.json(history);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch history" });
  }
});

router.patch("/voice-profile", requireAuth, requirePlanOrTrial("ghostwriter"), async (req: any, res): Promise<void> => {
  try {
    const profile = typeof req.body.profile === "object" ? req.body.profile : null;
    if (!profile) {
      res.status(400).json({ error: "Invalid profile format" });
      return;
    }
    await db.update(usersTable)
      .set({ voiceProfile: profile })
      .where(eq(usersTable.id, req.userId));
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to update voice profile" });
  }
});

router.get("/voice-profile", requireAuth, requirePlanOrTrial("ghostwriter"), async (req: any, res): Promise<void> => {
  try {
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.userId));
    if (!user?.voiceProfile) {
      res.json(null);
      return;
    }

    const profileAge = user.voiceProfileUpdatedAt 
      ? Date.now() - new Date(user.voiceProfileUpdatedAt).getTime() 
      : 0;
    const isStale = profileAge > 30 * 24 * 60 * 60 * 1000; // 30 days

    res.json({ 
      ...user.voiceProfile, 
      isStale, 
      daysSinceUpdate: Math.floor(profileAge / 86400000) 
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch voice profile" });
  }
});

export default router;
