import { Router, type IRouter } from "express";
import { GenerateHooksBody, GenerateHooksResponse } from "@workspace/api-zod";
import { openai } from "@workspace/integrations-openai-ai-server";
import { requireAuth, requirePlanOrTrial, consumeToolTrial } from "../../middlewares/planMiddleware";

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

router.post("/hooks/generate", requireAuth, requirePlanOrTrial("hooks"), async (req: any, res): Promise<void> => {
  const parsed = GenerateHooksBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request data." });
    return;
  }

  const { topic, tone } = parsed.data;

  const toneGuidance = {
    Casual: "Conversational and warm, like a trusted friend sharing something important. Use contractions. Keep rhythm natural and human. Never preachy or lecture-y. The kind of text someone sends to a friend they respect.",
    Professional: "Confident authority, earned through specificity. Every word is precise. Sounds like the most credible person in the room speaking to someone they respect as an equal. Data-grounded. No unnecessary enthusiasm.",
    Aggressive: "Zero tolerance for softness. Every word hits. Challenges assumptions directly and unapologetically. Forces a reaction. Uses contrast and repetition for rhetorical impact. Polarizing by design — those who disagree engage, those who agree share immediately.",
  }[tone] || "Natural, direct, specific. Write for a real person in a real situation.";

  const systemPrompt = `You are a master hook writer who has written opening lines that generated hundreds of millions of combined views. You know that the hook is responsible for 80% of whether content succeeds or fails — everything else is secondary.

Your understanding of hooks:
- A great hook doesn't just get attention — it EARNS the right to the next sentence
- The best hooks work because they create a SPECIFIC emotional state in a SPECIFIC type of person
- Hooks fail when they're vague, when they start with "I", when they ask permission, or when they promise something generic
- Great hooks use one of three mechanisms: create tension that demands resolution / challenge a belief the reader holds / make them feel precisely understood

TONE REQUIREMENT: ${toneGuidance}

ABSOLUTE RULES — THESE WILL NOT BE BROKEN:
✗ NEVER start with "Are you", "Have you ever", "Do you want to", "If you're looking for"
✗ NEVER use "game-changer", "life-changing", "mind-blowing", "eye-opening", "amazing"  
✗ NEVER start with "I" (weak — makes it about you, not them)
✗ NEVER be vague — every hook must have a specific detail, number, scenario, or named audience
✗ NEVER repeat the same structural pattern across different hooks
✓ EVERY hook must be specific to THIS topic, not generic advice
✓ EVERY hook should make ONE specific type of person immediately think "this is for me"
✓ Each hook must use a demonstrably different psychological mechanism`;

  const patternsInstructions = HOOK_PATTERNS.map((p, i) =>
    `Hook ${i + 1} — ${p.type}:\n${p.instruction}`
  ).join("\n\n");

  const userPrompt = `Generate 10 elite-level hooks for this topic: "${topic}"

Each hook MUST follow its specific pattern instruction precisely:

${patternsInstructions}

Quality standard: After writing each hook, ask yourself — "Would someone who knows this topic immediately stop scrolling when they read this?" If not, rewrite it until they would.

Return ONLY a JSON object containing a "hooks" key with an array of exactly 10 strings. Each string is one complete hook, ready to be copy-pasted as a post opener. No markdown, no code blocks, no explanations, no labels:
{"hooks": ["hook1", "hook2", "hook3", "hook4", "hook5", "hook6", "hook7", "hook8", "hook9", "hook10"]}`;

  try {
    const response = await openai.chat.completions.create({
      model: "llama-3.1-8b-instant",
    response_format: { type: "json_object" },
      max_tokens: 3500,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    });

    const rawContent = response.choices[0]?.message?.content ?? '{"hooks": []}';

    let hooks: string[];
    try {
      const parsedContent = JSON.parse(rawContent);
      hooks = Array.isArray(parsedContent.hooks) ? parsedContent.hooks : (Array.isArray(parsedContent) ? parsedContent : []);
    } catch {
      const arrayMatch = rawContent.match(/\[[\s\S]*\]/);
      hooks = arrayMatch ? JSON.parse(arrayMatch[0]) : [];
    }

    const hooksWithTypes = hooks.map((hook, i) => ({
      hook,
      type: HOOK_PATTERNS[i]?.type ?? "Hook",
    }));

    if (req.trialMode) {
      await consumeToolTrial(req.userId, "hooks");
    }

    res.json({ hooks, hooksWithTypes });
  } catch (err: any) {
    res.status(503).json({ error: "AI is temporarily unavailable. Please try again in a moment." });
  }
});

export default router;
