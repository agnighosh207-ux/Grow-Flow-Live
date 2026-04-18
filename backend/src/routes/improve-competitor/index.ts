import { Router, type IRouter } from "express";
import { ImproveCompetitorContentBody } from "@workspace/api-zod";
import { openai } from "@workspace/integrations-openai-ai-server";
import { requireAuth, requirePlanOrTrial, consumeToolTrial } from "../../middlewares/planMiddleware";

const router: IRouter = Router();

router.post("/improve-competitor", requireAuth, requirePlanOrTrial("improve_competitor"), async (req: any, res): Promise<void> => {
  const parsed = ImproveCompetitorContentBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request data." });
    return;
  }

  const { competitorContent } = parsed.data;

  const systemPrompt = `You are an elite content strategist and competitive intelligence expert. You don't just rewrite content — you OUTMANEUVER it. You find the gap between what a competitor said and what the audience actually needed to hear, then fill that gap with something so much better that anyone who reads both versions immediately understands why one creator wins and the other stays invisible.

Your competitive analysis process:
1. IDENTIFY: What psychological mechanism is the original using? (curiosity, identity, fear, aspiration?)
2. DIAGNOSE: Where does it fail? (too vague, weak hook, predictable angle, missing proof, no CTA, no emotion)
3. FIND THE GAP: What did the competitor completely miss? (the deeper truth, the contrarian angle, the specific scenario)
4. OUTPERFORM: Rewrite from a completely different angle that makes the original look generic by comparison

Your rewrites are:
- COMPLETELY ORIGINAL — different structure, different angle, different phrasing — not a word borrowed
- MORE SPECIFIC — concrete details, real numbers, vivid scenarios instead of vague claims
- PSYCHOLOGICALLY SHARPER — stronger hook mechanism, clearer emotional arc, better payoff
- MORE PLATFORM-NATIVE — reads like it belongs on social media, not like an essay

CRITICAL RULES:
✗ NEVER copy or paraphrase — start from scratch with a fresh angle on the same topic
✗ NEVER use the same opening structure as the original
✗ NEVER write something vague that the audience could have told themselves
✓ ALWAYS find the angle the competitor missed entirely
✓ ALWAYS make the rewrite more specific than the original`;

  const userPrompt = `Analyze this competitor content and create a version so much better that it makes the original look like a first draft:

---
${competitorContent}
---

First, identify:
1. What topic/niche is this? What audience does it target?
2. What mechanism was the creator trying to use? (curiosity gap, identity signal, social proof, fear, etc.)
3. Where does it fall flat? (weak hook, vague claims, predictable angle, missing proof, no real insight)
4. What angle did they completely miss that would resonate MUCH deeper with this audience?

Then deliver the improved version.

Return ONLY this exact JSON (no markdown, no code blocks):
{
  "competitorWeaknesses": [
    "Specific weakness 1 — be precise about what's wrong and why it fails",
    "Specific weakness 2",
    "Specific weakness 3"
  ],
  "missedAngle": "The angle the competitor completely missed — the deeper truth or more powerful perspective on this topic that would have performed far better",
  "improvedVersion": "A completely original, superior version of this content. Different angle, different structure, completely different phrasing. More specific, more emotionally resonant, more compelling than the original. Must be full-length content, not a summary. Write it as a complete social media post ready to copy-paste.",
  "strongerHook": "A single opening line (1-2 sentences) that is dramatically more attention-grabbing than anything in the original. Must create an open loop or bold claim that forces continued reading.",
  "newAngle": "The completely fresh angle on this exact topic that the original never touched — 2-3 sentences explaining what it is and why this resonates deeper",
  "monetization": {
    "ctaIdeas": [
      "Specific CTA tied directly to this content's topic — not generic 'click the link'. Example: 'Comment TEMPLATE below and I'll send you the exact framework I use.'",
      "A second distinct CTA using a different mechanism (comment trigger, DM trigger, lead magnet, link in bio with specific promise)",
      "A third CTA that builds community or social proof (tag someone, share with someone specific, save for later with specific reason)"
    ],
    "affiliateSuggestions": [
      "Specific product/service category that aligns perfectly with this content's niche + exact reason why this audience would buy it through this context",
      "Second affiliate angle with a different product category — include typical commission range and why it fits",
      "Third suggestion: a course, book, or digital product in this exact niche — include what type of creator would promote this successfully"
    ],
    "howToEarn": [
      "Specific monetization strategy using THIS type of content — include the exact funnel: content → lead magnet → email list → product (with estimated price point)",
      "Brand deal / sponsorship strategy: what brands would pay to be associated with this content and what makes this creator attractive to them",
      "Community or membership monetization: how to convert this content's audience into paying members and what they'd pay for"
    ]
  }
}`;

  const response = await openai.chat.completions.create({
    model: "llama-3.1-8b-instant",
    response_format: { type: "json_object" },
    max_tokens: 5000,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
  });

  const rawContent = response.choices[0]?.message?.content ?? "{}";

  let result;
  try {
    result = JSON.parse(rawContent);
  } catch {
    const jsonMatch = rawContent.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      result = JSON.parse(jsonMatch[0]);
    } else {
      throw new Error("Failed to parse AI response as JSON");
    }
  }

  if (req.trialMode) {
    await consumeToolTrial(req.userId, "improve_competitor");
  }

  res.json(result);
});

export default router;
