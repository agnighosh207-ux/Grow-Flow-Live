import { Router, type IRouter, type Response } from "express";
import { type AuthenticatedRequest } from "../../types";
import { getAuth } from "@clerk/express";
import { eq, desc, count, sql, and, gte, inArray, lt, isNull } from "drizzle-orm";
import { db, contentGenerationsTable, usersTable, usageLogsTable, featureUsageLogsTable, securityLogsTable, sharingLinksTable, shareFeedbacksTable, brandVoicesTable } from "@workspace/db";
import { nanoid } from "nanoid";
import { logger } from "../../lib/logger";
import crypto from "crypto";
import {
  GenerateContentBody,
  GenerateVariationsBody,
  GetContentHistoryQueryParams,
  GetHistoryItemParams,
  DeleteHistoryItemParams,
  GenerateContentResponse,
  GenerateVariationsResponse,
  GetContentHistoryResponse,
  GetHistoryItemResponse,
  DeleteHistoryItemResponse,
  GetContentStatsResponse,
} from "@workspace/api-zod";
// Note: zod is NOT a direct dependency of backend — use manual validation instead
import { generateContent, extractJson } from "../../services/ai-engine";
import { requireAuth, getOrCreateUser, requirePlanOrTrial, requireActivePlan } from "../../middlewares/planMiddleware";
import { enforceGenerationLimit, refundGenerationCredit } from "../../middlewares/generationLimiter";
import { invalidateAuthCache } from "../../middlewares/authSyncMiddleware";
import { sendCreditWarningEmail } from "../../services/email";
import { LANGUAGE_INSTRUCTIONS } from "../../lib/languages";

const router: IRouter = Router();

function sanitizeInput(text: string, maxLength: number = 500): string {
  if (!text) return "";
  return text
    .substring(0, maxLength)
    .replace(/[`<>{}\\]/g, "")
    .replace(/[\n\r]+/g, " ")
    .trim();
}

// requireAuth is now centralized in planMiddleware.ts (Flaw 20 fix)

async function generateContentWithAI(idea: string, contentType: string, tone: string, niche: string = "General", platformPreference: string = "", language: string = "English", userId: string = "anonymous", userPlan: string = "free", signal?: AbortSignal, brandVoiceId?: string) {
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

  const contentTypeInstructions: Record<string, string> = {
    Educational: `FORMAT — Educational/Framework: Teach one transformative concept that changes HOW the audience thinks, not just what they do. Use the "hidden truth" structure: expose what's wrong with common advice → reveal the better mental model → show the exact application. Ground everything in firsthand experience, not recycled theory. Each step must be actionable TODAY.`,
    Story: `FORMAT — Story/Experience: Use the "cinematic drop" structure — open IN the middle of the most dramatic moment (don't set up the scene, DROP into it). Then: what the situation was → the exact mistake made → the turning point → the specific result with real numbers or observable outcomes. The reader should feel like they're watching it happen, not being told about it.`,
    Viral: `FORMAT — Viral/Controversial: Open with the single most provocative truth that your niche refuses to say out loud. Then: prove it with 2-3 specific, undeniable data points. Acknowledge the counterargument BRIEFLY and dismantle it in one sentence. Close with an implication that makes readers uncomfortable enough to share it.`,
  };

  const toneInstructions: Record<string, string> = {
    Casual: `VOICE — Casual: Write exactly like a friend who just figured something out and is genuinely excited to share it. Contractions everywhere. Short bursts of energy. Occasional pause for emphasis. Warm, direct, never condescending. The kind of message you'd send someone you respect.`,
    Professional: `VOICE — Professional: The authority who's done the work speaks with earned confidence. Every claim has a number or outcome behind it. Uses industry language without jargon. Sounds like the most competent person in the room who has nothing to prove.`,
    Aggressive: `VOICE — Aggressive: Zero patience for soft thinking. Every sentence is a punch. Challenges the reader's assumptions directly. Calls out what everyone is afraid to say. Uses rhetorical repetition for emphasis. Polarizing by design — those who disagree will argue, those who agree will share immediately.`,
  };

  const nicheAdaptation: Record<string, string> = {
    Fitness: `NICHE — Fitness: Speak to the body transformation obsessed. Use specific metrics (drop body fat from X% to Y%, add 20lbs to bench, lose 4 inches). Reference the psychology of discipline vs motivation. Use gym culture shorthand authentically. Address the gap between what fitness influencers say vs what physiology research actually shows.`,
    Finance: `NICHE — Finance: Think like a hedge fund manager writing for smart retail investors. Use real compound math ("$500/month at 12% for 20 years = $494,967"). Contrast "what broke people do" vs "what wealthy people understand." Reference specific vehicles (index funds, Roth IRA, real estate leverage). Make FOMO of inaction mathematically undeniable.`,
    Tech: `NICHE — Tech: Speak to builders and operators who hate wasted time. Be specific about tools (not "use AI" — use "Claude 3 Sonnet for this, GPT-4o for that"). Give time savings in numbers ("I cut 3 hours per week to 12 minutes"). Reference actual workflow changes, not just theory. Developers respect precision over enthusiasm.`,
    Motivation: `NICHE — Motivation: Avoid all clichés. Ground every motivational truth in neuroscience, psychology, or behavioral economics ("dopamine loops," "identity-based habits," "cognitive load"). The best motivation content makes people feel seen, not lectured. Contrast the gap between who they are right now and the specific version of themselves they're capable of becoming.`,
    Business: `NICHE — Business: Talk like a founder who has shipped real products, fired people, and made payroll. Use systems thinking ("if X then Y then Z output"). Reference real metrics: CAC, LTV, churn, MRR. Avoid "hustle culture" BS. Speak to the operator who wants leverage, delegation, and asymmetric returns on their time.`,
    Lifestyle: `NICHE — Lifestyle: Frame everything around intentional design vs default living. Specific experiences over abstract concepts ("woke up at 5am for 90 days — here's what actually changed"). Contrast the person who drifts through life vs the person who architected it deliberately. Make aspiration feel achievable, not fantasy.`,
    General: ``,
  };

  const systemPrompt = `You are a world-class content strategist and viral copywriter. You have built multiple audiences past 500K followers across platforms. Your content gets studied, screenshot, and reposted because it says something true in a way nobody has said it before.

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

=== PLATFORM MASTERY REQUIREMENTS ===

INSTAGRAM CAPTION:
→ Hook (line 1): Must create an open loop in 10 words or less. Never start with "I" or "You". Start with the TENSION.
→ Lines 2-3: Deepen the tension. Make them feel the problem.
→ Body (4-6 short paragraphs): Each paragraph ends at a moment of curiosity that forces reading the next.
→ Line break every 1-2 sentences. No walls of text.
→ Closing line before CTA: Deliver the insight in one memorable, quotable sentence.
→ CTA: Ultra-specific. Not "follow for more." Example: "Save this — you'll want to come back to it."
→ Hashtags: 15 tags. Mix: 5 hyper-niche (under 100K posts), 5 mid-tier (100K-1M posts), 5 broad (1M+ posts).
→ Strategic emojis: 1-2 maximum, only when they replace a word more powerfully than the word itself.

YOUTUBE SHORTS SCRIPT:
→ First 3 words must create a hard open loop or bold claim. Examples: "Stop doing this." / "This changed everything." / "Nobody shows you..."
→ Write exactly as it would be SPOKEN — no reading voice, pure conversational energy.
→ Format: [HOOK - 10 seconds] → [TENSION BUILD - 10 seconds] → [CORE INSIGHT - 25 seconds] → [CTA - 5 seconds]
→ Every sentence is max 10 words. Short. Punchy. One idea per sentence.
→ Include [PAUSE] markers where a creator should dramatically pause.
→ End with a reason to watch the next video or follow.

TWITTER/X THREAD:
→ Tweet 1: A standalone statement so bold or surprising it could go viral BY ITSELF with zero context. This is not a setup — it IS the insight.
→ Tweets 2-6: Each tweet must be independently re-tweetable. Not just context — each one is a new insight.
→ Tweet 7: The most quotable, memorable version of the core idea. Something people screenshot. End with a soft CTA.
→ Max 240 characters per tweet. Count them.
→ No "1/", "2/" thread labels.
→ No filler. Every word earns its place.

LINKEDIN POST:
→ Opening line: A professional truth that challenges conventional wisdom. NOT "Excited to share..." Not "I've been thinking about..." Just the insight, cold.
→ Short paragraph breaks — 1-2 sentences max per paragraph.
→ Personal story element: One specific moment, one specific result (not vague "I improved").
→ The "uncomfortable truth for your industry" middle section.
→ The practical, implementable takeaway.
→ Closing question CTA that invites senior professionals to weigh in (not junior questions).
→ 3-5 hashtags only. Professional niche tags.

=== ABSOLUTE QUALITY RULES ===
✗ BANNED PHRASES: "consistency is key" / "believe in yourself" / "game-changer" / "life-changing" / "hustle hard" / "journey" (as metaphor) / "in today's world" / "tips and tricks" / "make sure to" / "don't forget to"
✗ NEVER start a hook with: "Are you..." / "Have you ever..." / "Do you want to..." / "If you're looking for..."
✗ NEVER use passive voice in hooks
✗ NEVER give advice without a specific example, number, or scenario
✓ EVERY sentence in the first 3 lines must increase curiosity or tension
✓ Every claim needs evidence: a number, a timeframe, or a specific outcome
✓ Write for ONE person's exact situation, not a demographic
✓ ZERO TYPOS: You must triple-check all spelling and grammar. Ensure output is perfectly polished, highly impressive, and 100% typo-free.`;

  const platformHint = platformPreference && platformPreference !== "All"
    ? `PLATFORM PRIORITY — The user's preferred platform is ${platformPreference}. Give special depth and quality to the ${platformPreference} section — it is most important to this creator.`
    : "";

  const userPrompt = `${contentTypeInstructions[contentType] || ""}
${toneInstructions[tone] || ""}
${nicheAdaptation[niche] || ""}
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
      language, // Fixed: Pass language to engine
      maxTokens: 4000,
      forceJsonMode: true,
      signal, // --- H-21 FIX: Pass AbortSignal ---
    });

    const rawContent = response.choices[0]?.message?.content || "{}";
    const finalContent = extractJson(rawContent);

    if (!finalContent || !finalContent.instagram) {
      throw new Error("Failed to generate valid content JSON structure");
    }

    return finalContent; // Return immediately
  } catch (err: any) {
    if (err.name === 'AbortError' || err.message === 'ABORTED') {
      throw err; // Propagate aborts
    }
    console.error("AI ENGINE CRITICAL FAILURE:", err);
    throw new Error(`AI Engine Failure: ${err?.message || "Unknown error"}`);
  }
}

router.post("/generate", requireAuth, enforceGenerationLimit, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  let isAborted = false;
  req.on('close', () => { isAborted = true; });
  // Manual validation (zod is not a direct backend dependency)
  const { idea, contentType, tone, language: bodyLanguage, brandVoiceId } = req.body || {};
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

  // Use the pre-fetched user from authSyncMiddleware (Identity Bridge)
  const user = (req as any).user;
  if (!user) {
    res.status(401).json({ error: "User context synchronization failed. Please refresh." });
    return;
  }

  // Limit enforcement is now handled by the global enforceGenerationLimit middleware (Flaw 5 fix)
  const isAdminUser = (req as any).user?.isAdmin === true;
  const status = isAdminUser ? "active" : (user?.subscriptionStatus ?? "free");
  const planTier = user?.planTier ?? "FREE";
  const generationsRemaining = user?.generationsRemaining ?? 0;


  const niche = typeof req.body.niche === "string" ? req.body.niche : "General";

  const savedNiche = user?.niche ?? null;
  const savedTone = user?.tonePreference ?? null;
  const savedPlatform = user?.platformPreference ?? null;
  const resolvedNiche = niche !== "General" ? niche : (savedNiche ?? niche);
  const resolvedTone = ((tone as string) !== "Default" && (tone as string) !== "default") ? tone : (savedTone ?? tone);
  const resolvedPlatform = (typeof req.body.platform === "string" ? req.body.platform : (savedPlatform ?? "all")).toLowerCase();

  const language = typeof req.body.language === "string" ? req.body.language : "English";

  const planType = user?.planType ?? "free";

  if (language !== "English") {
    const canUsePremiumLanguage = 
      status === "active" || 
      status === "trial" || 
      (status === "pending" && user?.planType && user.planType !== "free");
    
    if (!canUsePremiumLanguage) {
      const upgradeMessage = (user?.planType && user.planType !== "free")
        ? "Your subscription is not currently active. Please check your billing settings to restore access."
        : "🔥 Create content in 10 Premium Languages. Upgrade to unlock!";

      res.status(402).json({
        error: "upgrade_required",
        message: upgradeMessage,
        plan: status,
        generationsRemaining: (req as any).user?.generationsRemaining ?? generationsRemaining,
      });
      return;
    }
    if (status === "active" && planType === "starter") {
      if (!user?.regionalLanguageLock) {
        await db.update(usersTable).set({ regionalLanguageLock: language }).where(eq(usersTable.id, req.userId));
      } else if (user.regionalLanguageLock !== language) {
        res.status(402).json({
          error: "upgrade_required",
          message: `Your Starter plan is locked to ${user.regionalLanguageLock}. Upgrade to Creator for full language access!`,
          plan: status,
          generationsRemaining: (req as any).user?.generationsRemaining ?? generationsRemaining,
        });
        return;
      }
    }
  }

  let content: any;
  try {
    if (isAborted) return;
    const abortController = new AbortController();
    req.on('close', () => abortController.abort());

    content = await generateContentWithAI(idea, contentType, resolvedTone, resolvedNiche, resolvedPlatform, language, req.userId, user?.planType || "free", abortController.signal, brandVoiceId);
    
    // Add watermark for Free users
    if (status !== "active" && status !== "trial") {
      if (content.instagram && content.instagram.caption) {
        content.instagram.caption += "\n\n—\nGenerated with GrowFlow AI 🚀 growflowai.space";
      }
      if (content.youtube && content.youtube.script) {
        content.youtube.script += "\n\nGenerated by GrowFlow AI";
      }
      if (content.twitter && Array.isArray(content.twitter.tweets) && content.twitter.tweets.length > 0) {
        content.twitter.tweets[content.twitter.tweets.length - 1] += "\n\nMade with @GrowFlowAI";
      }
      if (content.linkedin && content.linkedin.post) {
        content.linkedin.post += "\n\n—\nContent by GrowFlow AI | growflowai.space";
      }
    }
  } catch (err: any) {
    console.error("AI Generation Fast Error:", err);
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

    // BUG 4 Fix: Move email warning after successful insert and use post-deduction value
    if (user?.email) {
      // Use the updated count from the user object (which was fetched after middleware decrement)
      const currentRemaining = user?.generationsRemaining ?? 0;
      if (currentRemaining <= 2) {
        sendCreditWarningEmail(user.email!, currentRemaining, planTier === "INFINITY").catch(e => console.error("Email warning error:", e));
      }
    }

    res.json({
      id: savedGen.id,
      content,
      idea, // Return idea for frontend analysis synchronization
      contentType, // Return contentType for frontend analysis synchronization
      niche: resolvedNiche, // Return niche for frontend analysis synchronization
      // BUG 3 Fix: Return the actual remaining count (already decremented by middleware)
      generationsRemaining: (req as any).user?.generationsRemaining ?? user?.generationsRemaining ?? 0,
      plan: status,
    });
    invalidateAuthCache(req.userId);

    // Trigger activation sequence day 0 if this is their first generation
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
    console.error("ROUTE ERROR (/content/generate):", err);
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

router.get("/insights/stats", requireAuth, async (req: any, res) => {
  try {
    const [thisWeek, lastWeek] = await Promise.all([
      db.select({ count: sql<number>`COUNT(*)` })
        .from(contentGenerationsTable)
        .where(and(
          eq(contentGenerationsTable.userId, req.userId),
          gte(contentGenerationsTable.createdAt, sql`NOW() - INTERVAL '7 days'`)
        )),
      db.select({ count: sql<number>`COUNT(*)` })
        .from(contentGenerationsTable)
        .where(and(
          eq(contentGenerationsTable.userId, req.userId),
          gte(contentGenerationsTable.createdAt, sql`NOW() - INTERVAL '14 days'`),
          lt(contentGenerationsTable.createdAt, sql`NOW() - INTERVAL '7 days'`)
        )),
    ]);

    const currentCount = Number(thisWeek[0]?.count || 0);
    const previousCount = Number(lastWeek[0]?.count || 0);
    const delta = currentCount - previousCount;
    const pct = previousCount > 0 ? Math.round((delta / previousCount) * 100) : 0;

    res.json({ thisWeek: currentCount, lastWeek: previousCount, delta, pct });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch insights" });
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
    res.json({ shareUrl: `https://growflowai.space/review/${shareId}`, shareId });
  } catch (err) {
    res.status(500).json({ error: "Failed to create share link" });
  }
});

router.post("/variations", requireAuth, requireActivePlan, enforceGenerationLimit, async (req: any, res): Promise<void> => {
  // Manual validation (zod is not a direct backend dependency)
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

  const user = (req as any).user;
  const planType = user?.planType ?? "free";
  const status = user?.subscriptionStatus ?? "free";


  // Track regenerations per topic
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

  if (planType === "starter" && regenCount >= 1) {
    res.status(403).json({
      error: "forbidden",
      message: "Starter plan includes 1 regeneration per topic. Upgrade to Creator to unlock more.",
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

  const languageInstructionsPrompt = LANGUAGE_INSTRUCTIONS[language] || "";

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
      language, // Fixed: Pass language to engine for variations
      maxTokens: 4000,
      forceJsonMode: true,
    });

    const rawContent = response.choices[0]?.message?.content ?? "{}";
    try {
      variations = JSON.parse(rawContent);
    } catch {
      const jsonMatch = rawContent.match(/\{[\s\S]*\}/);
      const jsonString = jsonMatch?.[0];
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

    db.insert(featureUsageLogsTable).values({
      id: crypto.randomUUID(),
      userId: req.userId,
      feature: "variations"
    }).catch(() => {});
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

    // 15-day retention window — filter only, never delete.
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
      .orderBy(desc(contentGenerationsTable.id)) // Consistent ordering for cursor
      .limit(limit);

    const nextCursor = history.length > 0 ? history[history.length - 1].id : null;

    res.json({ items: history, nextCursor });
  } catch (err) {
    console.error("History fetch error:", err);
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
    console.error("History item fetch error:", err);
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
    console.error("Stats fetch error:", err);
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

  if (!idea || idea.trim().length < 2) {
    res.status(400).json({ error: "Please provide a valid idea to analyze." });
    return;
  }

  const sanitizedIdea = String(idea).substring(0, 500);
  const sanitizedNiche = String(niche).substring(0, 50);

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
