import { Router, type IRouter } from "express";
import { getAuth } from "@clerk/express";
import { eq, desc, count, sql, and, gte } from "drizzle-orm";
import { db, contentGenerationsTable, usersTable } from "@workspace/db";
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
import { openai } from "@workspace/integrations-openai-ai-server";

const router: IRouter = Router();

const requireAuth = (req: any, res: any, next: any) => {
  const auth = getAuth(req);
  const userId = auth?.sessionClaims?.userId || auth?.userId;
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  req.userId = userId;
  next();
};

async function generateContentWithAI(idea: string, contentType: string, tone: string, niche: string = "General", platformPreference: string = "", language: string = "English") {
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

  const languageInstructions: Record<string, string> = {
    English: ``,
    Hindi: `LANGUAGE — You MUST write the complete content deeply and fluently in raw Hindi using the Devanagari script (हिन्दी). Do NOT use English letters to write Hindi. The tone should be highly emotional and storytelling-driven.`,
    Hinglish: `LANGUAGE — You MUST write the complete content in Hinglish (Hindi written entirely in the Roman/English alphabet, mixed with casual English words). This needs to read incredibly casual, GenZ style, and highly relatable to young desis. Keep the energy viral and raw. Avoid formal Hindi words.`,
    Bengali: `LANGUAGE — You MUST write the complete content natively and fluently in Bengali using the Bengali script (বাংলা). Do NOT use English letters to write Bengali. Keep the tone very engaging, culturally grounded, and natural sounding.`,
    Spanish: `LANGUAGE — You MUST write the complete content fluently in Spanish (Español). Keep the tone culturally appropriate and natural sounding.`,
    French: `LANGUAGE — You MUST write the complete content fluently in French (Français). Keep the tone culturally appropriate and natural sounding.`,
    German: `LANGUAGE — You MUST write the complete content fluently in German (Deutsch). Keep the tone culturally appropriate and natural sounding.`,
    Marathi: `LANGUAGE — You MUST write the complete content fluently in Marathi using the Devanagari script (मराठी). Do NOT use English letters to write Marathi.`,
    Tamil: `LANGUAGE — You MUST write the complete content fluently in Tamil using the Tamil script (தமிழ்). Do NOT use English letters to write Tamil.`,
    Telugu: `LANGUAGE — You MUST write the complete content fluently in Telugu using the Telugu script (తెలుగు). Do NOT use English letters to write Telugu.`
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
${languageInstructions[language] || ""}

TOPIC: "${idea}"

Generate elite-level content for all 4 platforms following the system instructions exactly.
Ensure keywords and hashtags match the selected language (e.g., if Bengali is selected, provide Bengali/English mix hashtags).

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
  "viral_feedback": "Brief feedback on why this content works.",
  "viral_suggestion": "💡 Pro Tip: One specific framing or delivery suggestion to make this go even more viral.",
  "seo_keywords": ["keyword1", "keyword2", "keyword3"],
  "hashtags": ["#tag1", "#tag2", "#tag3"]
}`;

  const response = await openai.chat.completions.create({
    model: "llama-3.1-8b-instant",
    response_format: { type: "json_object" },
    max_tokens: 4000,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
  });

  const rawContent = response.choices[0]?.message?.content ?? "{}";

  let parsed;
  try {
    parsed = JSON.parse(rawContent);
  } catch {
    const jsonMatch = rawContent.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      parsed = JSON.parse(jsonMatch[0]);
    } else {
      throw new Error("Failed to parse AI response as JSON");
    }
  }

  return parsed;
}

router.post("/content/generate", requireAuth, async (req: any, res): Promise<void> => {
  const parsed = GenerateContentBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.userId));
  if (!user) {
    await db.insert(usersTable).values({ id: req.userId }).onConflictDoNothing();
  }

  const [genCount] = await db
    .select({ count: count() })
    .from(contentGenerationsTable)
    .where(eq(contentGenerationsTable.userId, req.userId));
  const generationsUsed = Number(genCount?.count ?? 0);

  const now = new Date();
  let monthStart: Date;
  if ((user?.subscriptionStatus === "active" || user?.subscriptionStatus === "trial") && user?.trialStartDate) {
    const subStart = new Date(user.trialStartDate);
    const monthsElapsed = (now.getFullYear() - subStart.getFullYear()) * 12 + (now.getMonth() - subStart.getMonth());
    monthStart = new Date(subStart.getFullYear(), subStart.getMonth() + monthsElapsed, subStart.getDate());
    if (monthStart > now) {
      monthStart = new Date(subStart.getFullYear(), subStart.getMonth() + monthsElapsed - 1, subStart.getDate());
    }
  } else {
    monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  }
  const [monthlyGenCountRow] = await db
    .select({ count: count() })
    .from(contentGenerationsTable)
    .where(and(eq(contentGenerationsTable.userId, req.userId), gte(contentGenerationsTable.createdAt, monthStart)));
  const monthlyGenerationsUsed = Number(monthlyGenCountRow?.count ?? 0);

  const status = user?.subscriptionStatus ?? "free";
  const planType = user?.planType ?? "free";
  
  let canGenerate = false;
  if (status === "active") {
    if (planType === "starter") {
      canGenerate = monthlyGenerationsUsed < 20;
    } else if (planType === "creator") {
      canGenerate = monthlyGenerationsUsed < 100;
    } else {
      // Infinity -> soft limit, technically can still run
      canGenerate = true;
    }
  } else if (status === "trial" && user?.trialEndsAt && new Date(user.trialEndsAt) > now) {
    canGenerate = monthlyGenerationsUsed < 100; // Creator trial
  } else {
    canGenerate = generationsUsed < 3;
  }

  if (!canGenerate) {
    res.status(402).json({
      error: "upgrade_required",
      message: status === "trial"
        ? "Your trial has expired. Subscribe to continue generating."
        : status === "active" && planType === "starter" && monthlyGenerationsUsed >= 20
          ? "You've reached your 20 generations/month limit on Starter. Upgrade to Creator for 100 generations."
          : status === "active" && planType === "creator" && monthlyGenerationsUsed >= 100
            ? "You've reached your 100 generations/month limit. Upgrade to Infinity for unlimited access."
            : "🔥 You've unlocked the power — upgrade to continue your journey.",
      plan: status,
      generationsUsed,
    });
    return;
  }

  const { idea, contentType, tone } = parsed.data;
  const niche = typeof req.body.niche === "string" ? req.body.niche : "General";

  const freshUser = await db.select().from(usersTable).where(eq(usersTable.id, req.userId)).then(r => r[0]);
  const savedNiche = freshUser?.niche ?? null;
  const savedTone = freshUser?.tonePreference ?? null;
  const savedPlatform = freshUser?.platformPreference ?? null;
  const resolvedNiche = niche !== "General" ? niche : (savedNiche ?? niche);
  const resolvedTone = savedTone && savedTone !== tone ? savedTone : tone;
  const resolvedPlatform = savedPlatform ?? "";

  const language = typeof req.body.language === "string" ? req.body.language : "English";

  if (language !== "English") {
    if (status !== "active" && status !== "trial") {
      res.status(402).json({
        error: "upgrade_required",
        message: "🔥 Create content in 10 Premium Languages to reach a global audience. Unlock with premium!",
        plan: status,
        generationsUsed,
      });
      return;
    }
    if (status === "active" && planType === "starter") {
      if (!freshUser?.regionalLanguageLock) {
        await db.update(usersTable).set({ regionalLanguageLock: language }).where(eq(usersTable.id, req.userId));
      } else if (freshUser.regionalLanguageLock !== language) {
        res.status(402).json({
          error: "upgrade_required",
          message: `Your Starter plan is locked to ${freshUser.regionalLanguageLock}. Upgrade to Creator for full language access!`,
          plan: status,
          generationsUsed,
        });
        return;
      }
    }
  }

  let content: any;
  try {
    content = await generateContentWithAI(idea, contentType, resolvedTone, resolvedNiche, resolvedPlatform, language);
    
    // Add watermark for Free users
    if (status !== "active" && status !== "trial") {
      const watermarkStr = "\n\nGenerated by GrowFlow AI (Free Plan)";
      if (content.instagram && content.instagram.caption) content.instagram.caption += watermarkStr;
      if (content.youtube && content.youtube.script) content.youtube.script += watermarkStr;
      if (content.twitter && Array.isArray(content.twitter.tweets) && content.twitter.tweets.length > 0) {
        content.twitter.tweets[content.twitter.tweets.length - 1] += watermarkStr;
      }
      if (content.linkedin && content.linkedin.post) content.linkedin.post += watermarkStr;
    }
  } catch (err: any) {
    console.error("AI Generation Fast Error:", err);
    res.status(503).json({ error: "AI is temporarily unavailable. Please try again in a moment." });
    return;
  }

  try {
    const [savedGen] = await db.insert(contentGenerationsTable)
      .values({
        userId: req.userId,
        idea,
        contentType,
        tone,
        content,
      })
      .returning();

    res.json({
      id: savedGen.id,
      content,
      generationsUsed: generationsUsed + 1,
      plan: status,
    });
  } catch (err: any) {
    res.status(500).json({ error: "Failed to save generation. Please try again." });
    return;
  }
});

router.post("/content/variations", requireAuth, async (req: any, res): Promise<void> => {
  const parsed = GenerateVariationsBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.userId));
  const status = user?.subscriptionStatus ?? "free";
  const planType = user?.planType ?? "free";

  if (status !== "active" && status !== "trial") {
    res.status(402).json({
      error: "upgrade_required",
      message: "Upgrade to generate variations.",
    });
    return;
  }
  
  if (status === "active" && planType === "starter") {
    res.status(403).json({
      error: "forbidden",
      message: "Multi-variation limits are reserved for Creator & Infinity plans. Upgrade to unlock.",
    });
    return;
  }

  const { idea, contentType, tone, platform } = parsed.data;
  const niche = typeof req.body.niche === "string" ? req.body.niche : "General";
  const language = (parsed.data as any).language ?? "English";

  const languageInstructions: Record<string, string> = {
    English: ``,
    Hindi: `LANGUAGE — Write deeply and fluently in raw Hindi using the Devanagari script (हिन्दी). Do NOT use English letters.`,
    Hinglish: `LANGUAGE — Write in Hinglish (Hindi written entirely in the Roman/English alphabet, mixed with casual English words). Casual, GenZ style.`,
    Bengali: `LANGUAGE — Write natively and fluently in Bengali using the Bengali script (বাংলা). Do NOT use English letters.`,
    Spanish: `LANGUAGE — Write fluently in Spanish (Español).`,
    French: `LANGUAGE — Write fluently in French (Français).`,
    German: `LANGUAGE — Write fluently in German (Deutsch).`,
    Marathi: `LANGUAGE — Write fluently in Marathi using the Devanagari script (मराठी). Do NOT use English letters.`,
    Tamil: `LANGUAGE — Write fluently in Tamil using the Tamil script (தமிழ்). Do NOT use English letters.`,
    Telugu: `LANGUAGE — Write fluently in Telugu using the Telugu script (తెలుగు). Do NOT use English letters.`
  };

  const variationSystemPrompt = `You are an elite viral content creator generating 3 completely distinct variations of the same content piece. Each variation must:
- Use a COMPLETELY different angle, hook style, and narrative approach
- Target a different sub-segment of the same audience
- Use a different psychological trigger (curiosity vs identity vs fear vs aspiration)
- Have a different structure and rhythm
- NOT recycle phrases or sentences from the other variations
- ZERO TYPOS: Ensure spelling, grammar, and typography are absolutely perfect and professional.
${languageInstructions[language] || ""}

If variation 1 uses a story arc, variation 2 should use a bold claim, variation 3 should use a framework/listicle structure. Force genuine creative diversity.`;

  const variationUserPrompt = `Generate 3 completely distinct ${platform} content variations for this topic: "${idea}"
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
    const response = await openai.chat.completions.create({
      model: "llama-3.1-8b-instant",
    response_format: { type: "json_object" },
      max_tokens: 4000,
      messages: [
        { role: "system", content: variationSystemPrompt },
        { role: "user", content: variationUserPrompt },
      ],
    });

    const rawContent = response.choices[0]?.message?.content ?? "{}";
    try {
      variations = JSON.parse(rawContent);
    } catch {
      const jsonMatch = rawContent.match(/\{[\s\S]*\}/);
      variations = jsonMatch ? JSON.parse(jsonMatch[0]) : { variations: [] };
    }
  } catch (err: any) {
    res.status(503).json({ error: "AI is temporarily unavailable. Please try again in a moment." });
    return;
  }

  try {
    res.json({ variations: variations.variations ?? [] });
  } catch (err: any) {
    res.status(500).json({ error: "Failed to save variation. Please try again." });
    return;
  }
});

router.get("/content/history", requireAuth, async (req: any, res): Promise<void> => {
  const parsed = GetContentHistoryQueryParams.safeParse(req.query);
  const limit = parsed.success ? (parsed.data.limit ?? 20) : 20;

  const history = await db
    .select()
    .from(contentGenerationsTable)
    .where(eq(contentGenerationsTable.userId, req.userId))
    .orderBy(desc(contentGenerationsTable.createdAt))
    .limit(limit);

  res.json({ items: history });
});

router.get("/content/history/:id", requireAuth, async (req: any, res): Promise<void> => {
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
      ),
    )
    .limit(1);

  if (!item) {
    res.status(404).json({ error: "Not found" });
    return;
  }

  res.json({ item });
});

router.delete("/content/history/:id", requireAuth, async (req: any, res): Promise<void> => {
  const parsed = DeleteHistoryItemParams.safeParse(req.params);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid ID" });
    return;
  }

  await db
    .delete(contentGenerationsTable)
    .where(
      and(
        eq(contentGenerationsTable.id, parsed.data.id),
        eq(contentGenerationsTable.userId, req.userId),
      ),
    );

  res.json({ success: true });
});

router.get("/content/stats", requireAuth, async (req: any, res): Promise<void> => {
  const [totalRow] = await db
    .select({ count: count() })
    .from(contentGenerationsTable)
    .where(eq(contentGenerationsTable.userId, req.userId));

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - now.getDay());
  weekStart.setHours(0, 0, 0, 0);

  const [monthRow] = await db
    .select({ count: count() })
    .from(contentGenerationsTable)
    .where(
      and(
        eq(contentGenerationsTable.userId, req.userId),
        gte(contentGenerationsTable.createdAt, monthStart),
      ),
    );

  const [weekRow] = await db
    .select({ count: count() })
    .from(contentGenerationsTable)
    .where(
      and(
        eq(contentGenerationsTable.userId, req.userId),
        gte(contentGenerationsTable.createdAt, weekStart),
      ),
    );

  const topContentTypeRows = await db
    .select({ contentType: contentGenerationsTable.contentType, count: count() })
    .from(contentGenerationsTable)
    .where(eq(contentGenerationsTable.userId, req.userId))
    .groupBy(contentGenerationsTable.contentType)
    .orderBy(desc(count()))
    .limit(1);

  const topToneRows = await db
    .select({ tone: contentGenerationsTable.tone, count: count() })
    .from(contentGenerationsTable)
    .where(eq(contentGenerationsTable.userId, req.userId))
    .groupBy(contentGenerationsTable.tone)
    .orderBy(desc(count()))
    .limit(1);

  const total = Number(totalRow?.count ?? 0);
  const thisWeek = Number(weekRow?.count ?? 0);
  const thisMonth = Number(monthRow?.count ?? 0);
  const statsResponse: GetContentStatsResponse & { thisMonth: number } = {
    totalGenerations: total,
    thisWeek,
    thisMonth,
    topContentType: topContentTypeRows[0]?.contentType ?? "Educational",
    topTone: topToneRows[0]?.tone ?? "Professional",
    platformBreakdown: {
      instagram: Math.round(total * 0.35),
      youtube: Math.round(total * 0.25),
      twitter: Math.round(total * 0.20),
      linkedin: Math.round(total * 0.20),
    },
  };
  res.json(statsResponse);
});

export default router;
