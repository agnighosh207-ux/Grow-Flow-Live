import { Router, type IRouter } from "express";
import { GenerateHooksBody, GenerateHooksResponse } from "@workspace/api-zod";
import { requireAuth, requirePlanOrTrial } from "../../middlewares/planMiddleware";
import { enforceGenerationLimit } from "../../middlewares/generationLimiter";
import { LANGUAGE_INSTRUCTIONS } from "../../lib/languages";
import { generateContent, extractJson } from "../../services/ai-engine";
import { db, contentGenerationsTable, featureUsageLogsTable } from "@workspace/db";
import crypto from "crypto";

const router: IRouter = Router();

const HOOK_PATTERNS = [
  {
    type: "CURIOSITY GAP",
    instruction: `Create a sentence that reveals the EXISTENCE of something important without revealing what it is. The reader must engage to close the loop. The gap should feel personal and urgent — not general trivia. Example: "The reason most [niche] people hit a plateau at exactly the same point has nothing to do with [what they think]."`
  },
  {
    type: "BOLD CLAIM WITH PROOF",
    instruction: `Make a specific, surprising claim that is backed by a real number, timeframe, or outcome. The specificity is what makes it credible, not the boldness. The reader should think "wait, is that actually true?" Example: "I [did something counterintuitive] for [specific time]. [Specific measurable result]. Here's the part nobody tells you."`
  },
  {
    type: "RELATABLE PAIN POINT",
    instruction: `Name the reader's exact frustration with such precision that they feel seen and understood. Don't describe a problem — describe the FEELING of being stuck in it. Make them think "how did this person know exactly what's happening to me?" Example: "You've been doing [X] for [time]. You're still [stuck]. And the worst part? You're doing everything right."`
  },
  {
    type: "CONTROVERSIAL OPINION",
    instruction: `State a position that directly contradicts popular advice or commonly accepted wisdom in this niche. It must be a take that has substance and truth behind it — not just contrarian for attention. Forces people to either violently agree or disagree, both of which drive engagement. Example: "Unpopular opinion: [common advice everyone gives] is the reason most [audience] never [achieve desired outcome]."`
  },
  {
    type: "PATTERN INTERRUPT",
    instruction: `Open with the exact opposite of what someone would expect to read about this topic. Subvert the conventional wisdom completely. Start with the conclusion, not the setup. Make them question the advice they've been following. Example: "Stop [common thing everyone recommends]. Do this instead." or "The [popular approach] is why you're not seeing results."`
  },
  {
    type: "HYPER-SPECIFIC RESULT",
    instruction: `Lead with a result so specific and counterintuitive that the reader is immediately confused about how it's possible. The specificity creates instant credibility. The counterintuitive element creates questions. Example: "[Very specific number/result] in [very specific timeframe] by doing [surprising/counterintuitive thing]. No [common method they expected]."`
  },
  {
    type: "IDENTITY SIGNAL",
    instruction: `Target a specific type of person's self-concept or the person they want to become. This hook makes the right person think "this is about me" and the wrong person know this isn't for them. Selectivity is the point — the more targeted it is, the more the right people feel understood. Example: "If you're the type of person who [very specific identity trait or behavior], you already know this."`
  },
  {
    type: "CINEMATIC STORY OPENER",
    instruction: `Drop the reader directly into the middle of a compelling, specific moment — skip all setup and backstory. Start at the emotional peak or turning point. Create vivid scene in one sentence. The reader should feel they're watching it unfold. Example: "[Specific time/place/moment]. [One sentence of vivid scene]. That's when I realized [topic insight]."`
  },
  {
    type: "COST OF INACTION",
    instruction: `Name the specific, measurable cost of NOT knowing or acting on this information. Make inaction feel like an active choice with real consequences — financial, physical, social, or opportunity-based. The reader should feel urgency without manufactured panic. Example: "Every [time unit] you [do X / fail to do Y], you're [specific measurable loss]. That's [calculated total over longer period]."`
  },
  {
    type: "COUNTERINTUITIVE TRUTH",
    instruction: `Reveal a truth that is the exact opposite of what conventional wisdom suggests — and make it land with a specific example or observation that makes the reader think "I've experienced this but never connected the dots." Example: "The [thing that's supposed to help with X] is the exact reason most people [fail at X]. Here's what's actually happening."`
  },
];

router.post("/generate", requireAuth, requirePlanOrTrial("hooks"), enforceGenerationLimit, async (req: any, res): Promise<void> => {
  let isAborted = false;
  req.on('close', () => { isAborted = true; });

  const { topic, tone, language = "English" } = req.body;
  
  if (!topic) {
    res.status(400).json({ error: "Topic is required" });
    return;
  }

  const sanitizedTopic = String(topic).substring(0, 500);

  const toneGuidance = {
    Casual: "Conversational and warm, like a trusted friend sharing something important.",
    Professional: "Confident authority, earned through specificity. Precise and data-grounded.",
    Aggressive: "Direct, punchy, and unapologetic. Forces a reaction.",
  }[tone as string] || "Natural, direct, specific.";

  const systemPrompt = `You are a master hook writer. TONE: ${toneGuidance}. 
Rules: No "Are you", no generic words, no starting with "I". 
Every hook must be specific to the topic.`;

  const patternsInstructions = HOOK_PATTERNS.map((p, i) =>
    `Hook ${i + 1} — ${p.type}:\n${p.instruction}`
  ).join("\n\n");

  const userPrompt = `Generate 10 elite-level hooks for this topic: "${sanitizedTopic}"
  
${patternsInstructions}

Return ONLY a JSON object: {"hooks": ["hook1", ..., "hook10"]}`;

  try {
    if (isAborted) return;
    const response = await generateContent({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      userPlan: req.user?.planType || "free",
      userId: req.userId,
      language,
      maxTokens: 3000,
    });

    if (isAborted) return;
    const content = response.choices[0]?.message?.content || "";
    const parsed = extractJson(content);
    
    let hooks: string[] = [];
    if (parsed && Array.isArray(parsed.hooks)) {
      hooks = parsed.hooks;
    } else if (Array.isArray(parsed)) {
      hooks = parsed;
    } else {
      // Emergency fallback: try to extract lines
      hooks = content.split("\n").filter(l => l.trim().length > 10).slice(0, 10);
    }

    // Auto-save to history
    try {
      await db.insert(contentGenerationsTable).values({
        userId: req.userId,
        idea: `Hooks: ${sanitizedTopic}`,
        contentType: "Hooks",
        tone: tone || "Professional",
        content: { hooks },
      });
    } catch (e) { /* non-critical */ }

    res.json({ hooks });

    db.insert(featureUsageLogsTable).values({
      id: crypto.randomUUID(),
      userId: req.userId,
      feature: "hooks"
    }).catch(() => {});
  } catch (err: any) {
    if (isAborted) return;
    console.error("HOOK GEN ERROR:", err);
    res.status(503).json({ error: "AI temporarily unavailable. Please try again." });
  }
});

export default router;
