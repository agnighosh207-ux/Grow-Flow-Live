import { Router, type IRouter, type Response } from "express";
import { type AuthenticatedRequest } from "../../types";
import { eq, desc, count, sql, and, gte, inArray, lt, isNull } from "drizzle-orm";
import { db, contentGenerationsTable, usageLogsTable, featureUsageLogsTable, sharingLinksTable, brandVoicesTable } from "@workspace/db";
import { nanoid } from "nanoid";
import { logger } from "../../lib/logger";
import crypto from "node:crypto";
import {
  GetContentHistoryQueryParams,
  GetHistoryItemParams,
  DeleteHistoryItemParams,
  GetContentStatsResponse,
} from "@workspace/api-zod";
// Note: zod is NOT a direct dependency of backend — use manual validation instead
import { LANGUAGE_INSTRUCTIONS } from "../../lib/languages";
import { generateContent, webSearch, extractJson } from "../../services/ai-engine";
import { requireAuth, requirePlanOrTrial, requireActivePlan } from "../../middlewares/planMiddleware";
import { enforceGenerationLimit, refundGenerationCredit } from "../../middlewares/generationLimiter";
import { invalidateAuthCache } from "../../middlewares/authSyncMiddleware";
import { sendCreditWarningEmail } from "../../services/email";
import { 
  CONTENT_TYPE_INSTRUCTIONS, TONE_INSTRUCTIONS, NICHE_ADAPTATION, 
  SYSTEM_PROMPT_BASE, QUALITY_RULES, PLATFORM_REQUIREMENTS 
} from "./prompts";
import { redis } from "../../lib/redis";

const router: IRouter = Router();

import rateLimit, { ipKeyGenerator } from "express-rate-limit";

const demoLimiter = rateLimit({ windowMs: 60*1000, limit: 5, keyGenerator: (req: any, res: any) => ipKeyGenerator(req, res) });

router.post("/demo", demoLimiter, async (req: any, res) => {
  try {
    const { idea } = req.body;
    if (!idea || typeof idea !== "string" || idea.length > 120) {
      res.status(400).json({ error: "Invalid input" });
      return;
    }

    // --- GUEST TRACKING ---
    const guestId = req.cookies?.gf_guest_id || req.ip || "unknown";
    const cacheKey = `guest_demo:${guestId}`;
    let count = 0;

    if (redis) {
      const cached = await redis.get(cacheKey);
      count = cached ? parseInt(cached) : 0;
    }

    if (count >= 2) {
      res.status(403).json({ 
        error: "GUEST_LIMIT_REACHED", 
        message: "You've used your 2 free generations. Please log in to continue." 
      });
      return;
    }

    const sanitized = idea.replace(/[`"\\<>]/g, "").trim();
    const result = await generateContent({
      messages: [
        { role: "system", content: "You are an Instagram content expert. Generate ONE compelling Instagram caption (150-200 words) with 5 relevant hashtags. Be authentic, engaging and optimized for Indian creators. Return only the caption and hashtags, nothing else." },
        { role: "user", content: `Topic: ${sanitized}\nGenerate an Instagram caption:` },
      ],
      userPlan: "FREE",
      userId: "anonymous",
      maxTokens: 400,
    });
    
    const caption = result.choices[0]?.message?.content || "";

    // Increment count if successful
    if (caption && redis) {
      await redis.set(cacheKey, count + 1, "EX", 86400 * 7); // 7 days
      if (!req.cookies?.gf_guest_id) {
        res.cookie("gf_guest_id", guestId, { maxAge: 86400 * 7 * 1000, httpOnly: true });
      }
    }

    res.json({ caption });
  } catch (err) {
    logger.error({ err }, "Demo generation failed");
    res.status(500).json({ error: "Generation failed" });
  }
});

function sanitizeInput(text: string, maxLength: number = 500): string {
  if (!text) return "";
  return text
    .substring(0, maxLength)
    .replace(/[`<>{}\\]/g, "")
    .replace(/[\n\r]+/g, " ")
    .trim();
}

interface GenerateContentOptions {
  idea: string;
  contentType: string;
  tone: string;
  niche?: string;
  platformPreference?: string;
  language?: string;
  userId?: string;
  userPlan?: string;
  signal?: AbortSignal;
  brandVoiceId?: string;
}

async function generateContentWithAI({
  idea,
  contentType,
  tone,
  niche = "General",
  platformPreference = "",
  language = "English",
  userId = "anonymous",
  userPlan = "free",
  signal,
  brandVoiceId
}: GenerateContentOptions) {
  const liveContext = await webSearch(`${niche} ${contentType} viral content trends 2025`).catch(() => "");

  let voiceContext = "";
  if (brandVoiceId && brandVoiceId !== "none") {
    const [voice] = await db.select().from(brandVoicesTable).where(and(eq(brandVoicesTable.id, brandVoiceId), eq(brandVoicesTable.userId, userId)));
    if (voice) {
      voiceContext = `
=== BRAND VOICE PROFILE ===
This creator has a specific authentic voice you MUST replicate:
- Description: ${voice.aiDescription}
- Tone: ${voice.tone}
- Signature Phrases: ${voice.uniquePhrases?.join(", ")}
- Avoid Words: ${voice.avoidWords?.join(", ")}
- Vocabulary Style: ${voice.vocabulary?.join(", ")}
- Typical Post Length: ${voice.postLength}
- Emoji Usage: ${voice.emojiUsage}

MANDATORY: Write all content using THIS specific brand voice. Ignore the generic tone instructions if they conflict with this profile.`;
    }
  }

  const systemPrompt = `${SYSTEM_PROMPT_BASE}
${liveContext ? `\nLIVE TRENDING DATA:\n${liveContext}\n\nUse this live data to make content timely and relevant.` : ""}

=== MANDATORY PRE-GENERATION ANALYSIS ===
Before writing a single word of content, identify:
1. WHO EXACTLY is the ideal reader? (One person, one situation, one desire)
2. WHAT IS THE SINGLE MOST UNCOMFORTABLE TRUTH about this topic that most people avoid?
3. WHICH PSYCHOLOGICAL TRIGGER will make this impossible to scroll past?
   → Cognitive dissonance (they believe X, you show them X is wrong)
   → Status threat (they're falling behind and don't know it)
   → Identity confirmation (this is for people like ME)
   → Curiosity gap (they know something exists, not what it is)
   → Social proof with specificity (real numbers + real outcome)
4. WHAT IS THE SINGLE TAKEAWAY? (If they remember one thing, what is it?)

${PLATFORM_REQUIREMENTS}

${QUALITY_RULES}`;

  const platformHint = platformPreference && platformPreference !== "All"
    ? `PLATFORM PRIORITY — The user's preferred platform is ${platformPreference}. Give special depth and quality to the ${platformPreference} section — it is most important to this creator.`
    : "";

  const userPrompt = `${CONTENT_TYPE_INSTRUCTIONS[contentType] || ""}
${TONE_INSTRUCTIONS[tone] || ""}
${NICHE_ADAPTATION[niche] || ""}
${platformHint}

TOPIC: "${sanitizeInput(idea)}"

Generate elite-level content for all 4 platforms following the system instructions exactly.

Return ONLY valid JSON (no markdown, no code blocks):
{
  "instagram": {
    "hook": "opening line — hard open loop, max 15 words, specific not vague",
    "caption": "full body caption, short paragraph breaks, progressive tension, quotable insight near end",
    "visualBriefs": ["Slide 1: Image description. Text: ...", "Slide 2: ..."],
    "cta": "ultra-specific action (not like/follow) e.g. Save this / Tag someone",
    "hashtags": "15 hashtags: 5 niche + 5 mid-tier + 5 broad"
  },
  "youtube": {
    "hook": "exact first 5-8 spoken words",
    "title": "under 55 chars, curiosity-driven + searchable",
    "script": "full script with [HOOK] [TENSION BUILD] [MAIN CONTENT] [CTA] sections, conversational spoken rhythm"
  },
  "twitter": {
    "tweets": ["tweet1 standalone viral truth max 240 chars", "tweet2", "tweet3", "tweet4", "tweet5", "tweet6", "tweet7 quotable summary"]
  },
  "linkedin": {
    "headline": "first line — professional truth delivered cold",
    "post": "full post: specific moment → hard truth → mental model → measurable outcome, short paragraphs",
    "visualBriefs": ["Slide 1: Image description. Text: ..."],
    "cta": "question inviting professional discussion",
    "hashtags": "3-5 professional hashtags"
  },
  "viral_score": 85,
  "hook_strength": 82,
  "engagement_potential": 88,
  "shareability": 84,
  "viral_feedback": "Brief feedback on why this content works.",
  "viral_suggestion": "💡 Pro Tip: One specific framing or delivery suggestion to make this go even more viral.",
  "seo_keywords": ["keyword1", "keyword2", "keyword3"],
  "hashtags": ["#tag1", "#tag2", "#tag3"]
}`;

  try {
    const response = await generateContent({
      messages: [
        { role: "system", content: systemPrompt + voiceContext },
        { role: "user", content: userPrompt },
      ],
      userPlan,
      userId,
      language,
      maxTokens: 4000,
      forceJsonMode: true,
      signal,
    });

    const rawContent = response.choices[0]?.message?.content || "{}";
    const finalContent = extractJson(rawContent);

    if (!finalContent || !finalContent.instagram) {
      throw new Error("Failed to generate valid content JSON structure");
    }

    return finalContent;
  } catch (err: any) {
    if (err.name === 'AbortError' || err.message === 'ABORTED') {
      throw err;
    }
    logger.error({ err, userId }, "AI ENGINE CRITICAL FAILURE");
    throw new Error(`AI Engine Failure: ${err?.message || "Unknown error"}`);
  }
}

router.post("/generate", requireAuth, enforceGenerationLimit, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  let isAborted = false;
  req.on('close', () => { isAborted = true; });
  const { idea, contentType, tone, brandVoiceId } = req.body || {};
  const validContentTypes = ['Educational', 'Story', 'Viral'];
  const validTones = ['Casual', 'Professional', 'Aggressive', 'Default', 'default'];
  if (!idea || typeof idea !== 'string' || idea.length < 3) {
    res.status(400).json({ error: "Invalid request parameters", details: [{ message: "Idea must be at least 3 characters" }] });
    return;
  }
  if (!validContentTypes.includes(contentType)) {
    res.status(400).json({ error: "Invalid request parameters", details: [{ message: "Invalid contentType" }] });
    return;
  }
  if (!validTones.includes(tone)) {
    res.status(400).json({ error: "Invalid request parameters", details: [{ message: "Invalid tone" }] });
    return;
  }

  const user = (req as any).user;
  if (!user) {
    res.status(401).json({ error: "User context synchronization failed. Please refresh." });
    return;
  }

  const isAdminUser = user?.isAdmin === true;
  const status = isAdminUser ? "active" : (user?.subscriptionStatus ?? "free");
  const planTier = user?.planTier ?? "FREE";

  const niche = typeof req.body.niche === "string" ? req.body.niche : "General";

  const savedNiche = user?.niche ?? null;
  const savedTone = (req.user as any)?.preferredTone;
  const savedPlatform = (req.user as any)?.preferredPlatform;
  const resolvedNiche = niche !== "General" ? niche : (savedNiche ?? niche);
  const resolvedTone = ((tone as string) !== "Default" && (tone as string) !== "default") ? tone : (savedTone ?? tone);
  const resolvedPlatform = (typeof req.body.platform === "string" ? req.body.platform : (savedPlatform ?? "all")).toLowerCase();

  const language = typeof req.body.language === "string" ? req.body.language : "English";

  const planType = user?.planType ?? "free";

  if ((!planType || planType === "free") && language && language !== "English") {
    res.status(403).json({
      error: "language_locked",
      message: "Upgrade to Starter or higher to generate content in regional languages.",
      requiredPlan: "starter"
    });
    return;
  }

  let content: any;
  try {
    if (isAborted) return;
    const abortController = new AbortController();
    req.on('close', () => abortController.abort());

    content = await generateContentWithAI({
      idea,
      contentType,
      tone: resolvedTone,
      niche: resolvedNiche,
      platformPreference: resolvedPlatform,
      language,
      userId: req.userId,
      userPlan: user?.planType || "free",
      signal: abortController.signal,
      brandVoiceId
    });
    
    if (status !== "active" && status !== "trial") {
      if (content?.instagram?.caption) {
        content.instagram.caption += "\n\n—\nGenerated with GrowFlow AI 🚀 growflowai.space";
      }
      if (content?.youtube?.script) {
        content.youtube.script += "\n\nGenerated by GrowFlow AI";
      }
      if (content?.twitter?.tweets && Array.isArray(content.twitter.tweets) && content.twitter.tweets.length > 0) {
        const tweets = content.twitter.tweets;
        tweets[tweets.length - 1] += "\n\nMade with @GrowFlowAI";
      }
      if (content?.linkedin?.post) {
        content.linkedin.post += "\n\n—\nContent by GrowFlow AI | growflowai.space";
      }
    }
  } catch (err: any) {
    logger.error({ err, userId: req.userId }, "AI Generation Fast Error");
    await refundGenerationCredit(req.userId, user?.planTier);
    res.status(503).json({ error: "AI is temporarily unavailable. Please try again in a moment." });
    return;
  }

  try {
    const [savedGen] = await db.insert(contentGenerationsTable)
      .values({
        userId: req.userId,
        idea,
        contentType,
        tone: resolvedTone,
        platform: resolvedPlatform,
        content,
      })
      .returning();

    await db.insert(usageLogsTable).values({
      userId: req.userId,
      promptLanguage: language,
      action: "GENERATE_CONTENT"
    });

    if (user?.email) {
      const currentRemaining = user?.generationsRemaining ?? 0;
      if (currentRemaining <= 2 && planTier !== "INFINITY") {
        sendCreditWarningEmail(user.email!, currentRemaining, false).catch(e => 
          logger.error({ e }, "Credit warning email failed")
        );
      }
    }

    res.json({
      id: savedGen.id,
      content,
      idea,
      contentType,
      niche: resolvedNiche,
      generationsRemaining: req.user?.generationsRemaining ?? user?.generationsRemaining ?? 0,
      plan: status,
    });
    invalidateAuthCache(req.userId);

    if ((user?.totalGenerations || 0) <= 1) {
      import("../../services/emailSequences").then(({ sendSequenceEmail }) => {
        sendSequenceEmail(req.userId, "activation", 0);
      }).catch((e) => logger.error({ err: e.message }, "Failed to trigger activation email"));
    }

    db.insert(featureUsageLogsTable).values({
      id: crypto.randomUUID(),
      userId: req.userId,
      feature: "content_generate"
    }).catch(() => {});
  } catch (err: any) {
    logger.error({ err, userId: req.userId }, "ROUTE ERROR (/content/generate)");
    await refundGenerationCredit(req.userId, user?.planTier);
    const httpStatus = err?.status || 500;
    const message = err?.message || "An unexpected error occurred during generation.";
    res.status(httpStatus).json({ 
      error: "generation_failed", 
      message,
      details: process.env.NODE_ENV === "development" ? err?.stack : undefined
    });
    return;
  }
});

router.post("/:id/share", requireAuth, async (req: any, res) => {
  try {
    const shareId = nanoid(8);
    await db.insert(sharingLinksTable).values({
      id: shareId,
      userId: req.userId,
      contentId: req.params.id,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    });
    res.json({ success: true, code: shareId, referralUrl: `https://growflowai.space/review/${shareId}` });
  } catch (err) {
    res.status(500).json({ error: "Failed to create share link" });
  }
});

router.post("/variations", requireAuth, requireActivePlan, enforceGenerationLimit, async (req: any, res): Promise<void> => {
  const { idea, contentType, tone, platform, language: bodyLanguage2 } = req.body || {};
  const validContentTypes2 = ['Educational', 'Story', 'Viral'];
  const validTones2 = ['Casual', 'Professional', 'Aggressive', 'Default', 'default'];
  if (!idea || typeof idea !== 'string' || idea.length < 3) {
    res.status(400).json({ error: "Invalid request parameters", details: [{ message: "Idea must be at least 3 characters" }] });
    return;
  }
  if (!validContentTypes2.includes(contentType)) {
    res.status(400).json({ error: "Invalid request parameters", details: [{ message: "Invalid contentType" }] });
    return;
  }
  if (!validTones2.includes(tone)) {
    res.status(400).json({ error: "Invalid request parameters", details: [{ message: "Invalid tone" }] });
    return;
  }

  const user = req.user;
  const planType = user?.planType ?? "free";
  const status = user?.subscriptionStatus ?? "free";

  const [existingGeneration] = await db.select()
    .from(contentGenerationsTable)
    .where(
      and(
        eq(contentGenerationsTable.userId, req.userId),
        eq(contentGenerationsTable.idea, idea)
      )
    )
    .orderBy(desc(contentGenerationsTable.createdAt))
    .limit(1);

  let regenCount = 0;
  if (existingGeneration && typeof existingGeneration.content === "object" && existingGeneration.content !== null) {
    regenCount = (existingGeneration.content as any).regenerationsCount || 0;
  }

  if (planType === "starter" && regenCount >= 3) {
    res.status(403).json({
      error: "forbidden",
      message: "Starter plan includes 3 regenerations per topic. Upgrade to Creator to unlock more.",
    });
    return;
  }

  if (status === "active" && planType === "creator" && regenCount >= 3) {
    res.status(403).json({
      error: "forbidden",
      message: "Creator plan includes 3 regenerations per topic. Upgrade to Infinity for unlimited regenerations.",
    });
    return;
  }

  if (status === "trial" && user?.trialEndsAt && new Date(user.trialEndsAt) > new Date() && regenCount >= 3) {
    res.status(403).json({
      error: "forbidden",
      message: "Trial includes 3 regenerations per topic. Upgrade to Infinity for unlimited access.",
    });
    return;
  }

  const niche = typeof req.body.niche === "string" ? req.body.niche : "General";
  const language = bodyLanguage2 ?? "English";

  const variationSystemPrompt = `You are an elite viral content creator generating 3 completely distinct variations of the same content piece. Each variation must:
- Use a COMPLETELY different angle, hook style, and narrative approach
- Target a different sub-segment of the same audience
- Use a different psychological trigger (curiosity vs identity vs fear vs aspiration)
- Have a different structure and rhythm
- NOT recycle phrases or sentences from the other variations
- ZERO TYPOS: Ensure spelling, grammar, and typography are absolutely perfect and professional.

If variation 1 uses a story arc, variation 2 should use a bold claim, variation 3 should use a framework/listicle structure. Force genuine creative diversity.`;

  const variationUserPrompt = `Generate 3 completely distinct ${platform} content variations for this topic: "${sanitizeInput(idea)}"
Content type: ${contentType} | Tone: ${tone} | Niche: ${niche} | Language: ${language}

Each variation must feel like it was written by a different creator with a different creative perspective.

Return ONLY this JSON:
{
  "variations": [
    {
      "label": "Variation A — [brief angle description]",
      "hook": "The opening line/hook for this variation",
      "content": "The full content variation (platform-appropriate length and format)",
      "approach": "1 sentence describing the unique psychological approach used"
    },
    {
      "label": "Variation B — [brief angle description]",
      "hook": "The opening line/hook for this variation",
      "content": "The full content variation",
      "approach": "1 sentence describing the unique psychological approach used"
    },
    {
      "label": "Variation C — [brief angle description]",
      "hook": "The opening line/hook for this variation",
      "content": "The full content variation",
      "approach": "1 sentence describing the unique psychological approach used"
    }
  ]
}`;

  let variations: any;
  try {
    const response = await generateContent({
      messages: [
        { role: "system", content: variationSystemPrompt },
        { role: "user", content: variationUserPrompt },
      ],
      userPlan: planType.toUpperCase(),
      userId: req.userId,
      language,
      maxTokens: 4000,
      forceJsonMode: true,
    });

    const rawContent = response.choices[0]?.message?.content ?? "{}";
    try {
      variations = JSON.parse(rawContent);
    } catch (err) {
      logger.error({ err, userId: req.userId }, "Failed to parse variations JSON");
      const match = /\{[\s\S]*\}/.exec(rawContent);
      const jsonString = match ? match[0] : null;
      if (jsonString) {
        variations = JSON.parse(jsonString as string);
      } else {
        variations = { variations: [] };
      }
    }
  } catch (err: any) {
    logger.error({ err: String(err) }, "Variations generation error");
    await refundGenerationCredit(req.userId, user?.planTier);
    res.status(503).json({ error: "AI is temporarily unavailable. Please try again in a moment." });
    return;
  }

  try {
    if (existingGeneration && typeof existingGeneration.content === "object" && existingGeneration.content !== null) {
      const updatedContent = { ...(existingGeneration.content as any), regenerationsCount: regenCount + 1 };
      await db.update(contentGenerationsTable).set({ content: updatedContent }).where(eq(contentGenerationsTable.id, existingGeneration.id));
    }
    res.json({ variations: variations.variations ?? [] });

    await db.insert(featureUsageLogsTable).values({
      id: crypto.randomUUID(),
      userId: req.userId,
      feature: "content_variations"
    }).catch(err => logger.error({ err }, "Failed to log variations usage"));
  } catch (err: any) {
    res.status(500).json({ error: "Failed to save variation. Please try again." });
    return;
  }
});

router.get("/history", requireAuth, async (req: any, res): Promise<void> => {
  try {
    const parsed = GetContentHistoryQueryParams.safeParse(req.query);
    const rawLimit = parsed.success ? (parsed.data.limit ?? 50) : 50;
    const limit = Math.min(rawLimit, 200);
    const category = typeof req.query.category === "string" ? req.query.category : undefined;

    const fifteenDaysAgo = new Date();
    fifteenDaysAgo.setDate(fifteenDaysAgo.getDate() - 15);

    const conditions = [
      eq(contentGenerationsTable.userId, req.userId),
      gte(contentGenerationsTable.createdAt, fifteenDaysAgo),
      isNull(contentGenerationsTable.deletedAt),
    ];

    const cursorStr = typeof req.query.cursor === "string" ? req.query.cursor : undefined;
    const cursor = cursorStr ? Number(cursorStr) : undefined;
    
    if (cursor !== undefined && Number.isInteger(cursor) && cursor > 0) {
      conditions.push(lt(contentGenerationsTable.id, cursor));
    }

    if (category && category !== "all") {
      const categories = category.split(",").map((c: string) => c.trim());
      if (categories.length > 1) {
        conditions.push(inArray(contentGenerationsTable.contentType, categories));
      } else {
        conditions.push(eq(contentGenerationsTable.contentType, categories[0]));
      }
    }

    const history = await db
      .select()
      .from(contentGenerationsTable)
      .where(and(...conditions))
      .orderBy(desc(contentGenerationsTable.id))
      .limit(limit);

    const nextCursor = history.length > 0 ? history[history.length - 1].id : null;

    res.json({ items: history, nextCursor });
  } catch (err) {
    logger.error({ err, userId: req.userId }, "History fetch error");
    res.status(500).json({ error: "Failed to fetch history" });
  }
});

router.get("/history/:id", requireAuth, async (req: any, res): Promise<void> => {
  try {
    const parsed = GetHistoryItemParams.safeParse(req.params);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid ID" });
      return;
    }

    const [item] = await db
      .select()
      .from(contentGenerationsTable)
      .where(
        and(
          eq(contentGenerationsTable.id, parsed.data.id),
          eq(contentGenerationsTable.userId, req.userId),
          isNull(contentGenerationsTable.deletedAt),
        ),
      )
      .limit(1);

    if (!item) {
      res.status(404).json({ error: "Not found" });
      return;
    }

    res.json({ item });

    db.insert(featureUsageLogsTable).values({
      id: crypto.randomUUID(),
      userId: req.userId,
      feature: "content_view"
    }).catch(() => {});
  } catch (err) {
    logger.error({ err, userId: req.userId }, "History item fetch error");
    res.status(500).json({ error: "Failed to fetch history item" });
  }
});

router.delete("/history/:id", requireAuth, async (req: any, res): Promise<void> => {
  const parsed = DeleteHistoryItemParams.safeParse(req.params);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid ID" });
    return;
  }

  await db
    .update(contentGenerationsTable)
    .set({ deletedAt: new Date() })
    .where(
      and(
        eq(contentGenerationsTable.id, parsed.data.id),
        eq(contentGenerationsTable.userId, req.userId),
      ),
    );

  res.json({ success: true });
});

router.post("/history/:id/restore", requireAuth, async (req: any, res): Promise<void> => {
  const parsed = GetHistoryItemParams.safeParse(req.params);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid ID" });
    return;
  }

  await db
    .update(contentGenerationsTable)
    .set({ deletedAt: null })
    .where(
      and(
        eq(contentGenerationsTable.id, parsed.data.id),
        eq(contentGenerationsTable.userId, req.userId),
      ),
    );

  res.json({ success: true });
});

router.get("/stats", requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay());
    weekStart.setHours(0, 0, 0, 0);

    const [statsData] = await db
      .select({
        total: count(),
        thisMonth: sql<number>`count(*) filter (where ${contentGenerationsTable.createdAt} >= ${monthStart})`,
        thisWeek: sql<number>`count(*) filter (where ${contentGenerationsTable.createdAt} >= ${weekStart})`,
      })
      .from(contentGenerationsTable)
      .where(and(
        eq(contentGenerationsTable.userId, req.userId),
        isNull(contentGenerationsTable.deletedAt)
      ));

    const topContentTypeRows = await db
      .select({ contentType: contentGenerationsTable.contentType, count: count() })
      .from(contentGenerationsTable)
      .where(and(
        eq(contentGenerationsTable.userId, req.userId),
        isNull(contentGenerationsTable.deletedAt)
      ))
      .groupBy(contentGenerationsTable.contentType)
      .orderBy(desc(count()))
      .limit(1);

    const topToneRows = await db
      .select({ tone: contentGenerationsTable.tone, count: count() })
      .from(contentGenerationsTable)
      .where(and(
        eq(contentGenerationsTable.userId, req.userId),
        isNull(contentGenerationsTable.deletedAt)
      ))
      .groupBy(contentGenerationsTable.tone)
      .orderBy(desc(count()))
      .limit(1);

    const platformStats = await db
      .select({ platform: contentGenerationsTable.platform, count: count() })
      .from(contentGenerationsTable)
      .where(and(
        eq(contentGenerationsTable.userId, req.userId),
        isNull(contentGenerationsTable.deletedAt)
      ))
      .groupBy(contentGenerationsTable.platform);

    const breakdown: Record<string, number> = {};
    platformStats.forEach(s => {
      if (s.platform) {
        breakdown[s.platform.toLowerCase()] = Number(s.count);
      }
    });

    const statsResponse: GetContentStatsResponse & { thisMonth: number; platformBreakdown: any } = {
      totalGenerations: Number(statsData?.total ?? 0),
      thisWeek: Number(statsData?.thisWeek ?? 0),
      thisMonth: Number(statsData?.thisMonth ?? 0),
      topContentType: topContentTypeRows[0]?.contentType ?? "Educational",
      topTone: topToneRows[0]?.tone ?? "Professional",
      platformBreakdown: breakdown as any
    };
    res.json(statsResponse);
  } catch (err) {
    logger.error({ err, userId: req.userId }, "Stats fetch error");
    res.status(500).json({ error: "Failed to fetch stats" });
  }
});

router.get("/insights/stats", requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const [thisWeek, lastWeek] = await Promise.all([
      db.select({ count: sql<number>`count(*)` })
        .from(contentGenerationsTable)
        .where(and(
          eq(contentGenerationsTable.userId, req.userId),
          gte(contentGenerationsTable.createdAt, sql`now() - interval '7 days'`),
          isNull(contentGenerationsTable.deletedAt)
        )),
      db.select({ count: sql<number>`count(*)` })
        .from(contentGenerationsTable)
        .where(and(
          eq(contentGenerationsTable.userId, req.userId),
          gte(contentGenerationsTable.createdAt, sql`now() - interval '14 days'`),
          lt(contentGenerationsTable.createdAt, sql`now() - interval '7 days'`),
          isNull(contentGenerationsTable.deletedAt)
        )),
    ]);

    const thisCount = Number(thisWeek[0]?.count ?? 0);
    const lastCount = Number(lastWeek[0]?.count ?? 0);
    const delta = thisCount - lastCount;
    const pct = lastCount > 0 ? Math.round((delta / lastCount) * 100) : (thisCount > 0 ? 100 : 0);

    res.json({ thisWeek: thisCount, lastWeek: lastCount, delta, pct });
  } catch (err) {
    logger.error({ err }, "Insights stats error");
    res.status(500).json({ error: "Failed to fetch insights" });
  }
});

router.post("/analyze", requireAuth, requirePlanOrTrial("content_analyze"), enforceGenerationLimit, async (req: any, res): Promise<void> => {
  const { idea, contentType = "Educational", niche = "General", platforms } = req.body as {
    idea: string;
    contentType?: string;
    niche?: string;
    platforms?: Record<string, string>;
  };

  if (typeof idea !== "string" || idea.trim().length < 2) {
    res.status(400).json({ error: "Please provide a valid idea string to analyze." });
    return;
  }

  const sanitizedIdea = idea.substring(0, 500);
  const sanitizedNiche = typeof niche === "string" ? niche.substring(0, 50) : "General";

  const nicheContextMap: Record<string, string> = {
    Fitness: "body transformation, training optimization, nutrition science, gym culture, injury prevention, performance metrics, workout psychology, recovery",
    Finance: "wealth building, investment strategies, financial independence, tax optimization, passive income streams, debt elimination, compound growth, money psychology",
    Tech: "AI tools, developer productivity, automation workflows, SaaS building, technical writing, open source, tech career growth, software architecture",
    Motivation: "behavior change, habit formation, identity transformation, cognitive psychology, peak performance, mental resilience, self-discipline, goal architecture",
    Business: "startup strategy, marketing systems, sales frameworks, team building, founder psychology, product-market fit, revenue scaling, operational leverage",
    Lifestyle: "intentional design, minimalism vs maximalism, relationship design, travel intelligence, creative living, morning/evening systems, energy management",
    General: "content creation, personal brand building, social media growth, creator monetization, audience psychology",
  };

  const nichePainPoints: Record<string, string> = {
    Fitness: "People are overwhelmed by conflicting advice, secretly afraid they're doing it wrong, and frustrated by plateaus they can't explain.",
    Finance: "People feel left behind financially, embarrassed by their money decisions, and scared of making the wrong move.",
    Tech: "Developers and builders are drowning in tool overwhelm, fighting with their own workflows.",
    Motivation: "People are stuck in a loop of starting and quitting, tired of generic advice that doesn't work for them.",
    Business: "Founders and operators are grinding without traction, making decisions blindly.",
    Lifestyle: "People feel like they're living someone else's life, constantly busy but never fulfilled.",
    General: "Creators feel invisible despite putting in the work, unsure what content actually performs.",
  };

  const nicheContext = nicheContextMap[sanitizedNiche] || nicheContextMap["General"];
  const painPoint = nichePainPoints[sanitizedNiche] || nichePainPoints["General"];

  const contentSample = platforms
    ? Object.values(platforms).filter(Boolean).slice(0, 2).join("\n\n---\n\n").slice(0, 800)
    : "";

  const systemPrompt = `You are a viral content analyst. Provide surgical analysis explaining why a piece of content will perform.
Grounded in: Live Trending Psychological Triggers, Platform Algorithm Signals, Hook Science, and Niche Audience Psychology.`;

  const userPrompt = `Analyze this content for performance potential:
IDEA: "${sanitizedIdea}"
CONTENT TYPE: ${contentType}
NICHE: ${sanitizedNiche}
${contentSample ? `\nSAMPLE CONTENT:\n${contentSample}` : ""}

Return ONLY valid JSON:
{
  "viralityScore": number,
  "hookStrength": number,
  "engagementPotential": number,
  "shareability": number,
  "emotionalTrigger": "string",
  "curiosityGap": "string",
  "targetAudienceReaction": "string",
  "improvementTip": "string"
}`;

  try {
    const completion = await generateContent({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      userPlan: req.user?.planType || "free",
      userId: req.userId,
      maxTokens: 1200,
      forceJsonMode: true,
    });

    const raw = completion.choices[0]?.message?.content?.trim() ?? "{}";
    const analysis = extractJson(raw);

    if (!analysis) {
      res.status(500).json({ error: "Failed to parse content analysis" });
      return;
    }

    res.json(analysis);

    db.insert(featureUsageLogsTable).values({
      id: crypto.randomUUID(),
      userId: req.userId,
      feature: "content_analyze"
    }).catch(() => {});
  } catch (err) {
    console.error("ANALYZE ERROR:", err);
    await refundGenerationCredit(req.userId, req.user?.planTier);
    res.status(500).json({ error: "Failed to analyze content" });
  }
});

export default router;
