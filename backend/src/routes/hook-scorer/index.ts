import { Router } from "express";
import { requireAuth } from "../../middlewares/planMiddleware";
import { z } from "zod";
import { generateContent, extractJson } from "../../services/ai-engine";

const router = Router();

const SCORE_SCHEMA = z.object({
  hook: z.string().min(5).max(280),
  platform: z.string(),
  niche: z.string()
});

const URGENCY_WORDS = ["stop", "never", "always", "secret", "mistake", "truth", "warning", "finally", "immediately"];
const POWER_WORDS = ["proven", "exact", "specific", "real", "honest", "brutal"];

router.post("/score", requireAuth, async (req, res) => {
  try {
    const { hook, platform, niche } = SCORE_SCHEMA.parse(req.body);

    const hookLower = hook.toLowerCase();
    const patternMatches: string[] = [];
    let patternScore = 0;

    // Pattern 1: Numbers/Data
    if (/\d+/.test(hook)) {
      patternMatches.push("Contains Data/Numbers");
      patternScore += 15;
    }

    // Pattern 2: Question
    if (hook.includes("?")) {
      patternMatches.push("Question Format");
      patternScore += 10;
    }

    // Pattern 3: "You" targeting
    if (hookLower.includes("you") || hookLower.includes("your")) {
      patternMatches.push("Direct Targeting ('You')");
      patternScore += 10;
    }

    // Pattern 4: Urgency
    if (URGENCY_WORDS.some(w => hookLower.includes(w))) {
      patternMatches.push("Urgency Word");
      patternScore += 10;
    }

    // Pattern 5: Power words
    if (POWER_WORDS.some(w => hookLower.includes(w))) {
      patternMatches.push("Power Word");
      patternScore += 10;
    }

    // Pattern 6: Negative framing
    if (hookLower.includes("don't") || hookLower.includes("stop") || hookLower.includes("never") || hookLower.includes("avoid")) {
      patternMatches.push("Negative Framing");
      patternScore += 5;
    }

    // Max 60 for patterns
    patternScore = Math.min(patternScore, 60);

    // Call AI
    const systemPrompt = `You are a hook scoring engine. Score this hook and return only JSON.
Format must be exactly: {"aiScore": number (0-40 additional points), "mainIssue": string | null, "quickFix": string | null, "hookType": string}`;
    const userPrompt = `Score this hook for ${platform} in the ${niche} niche. Hook: '${hook}'`;

    let aiResult;
    try {
      const response = await generateContent({
        messages: [{ role: "system", content: systemPrompt }, { role: "user", content: userPrompt }],
        userPlan: "FREE",
        temperature: 0.2,
        maxTokens: 300
      });
      
      aiResult = extractJson(response.choices[0]?.message?.content || "{}") || { aiScore: 20, mainIssue: null, quickFix: null, hookType: "Standard" };
    } catch (e) {
      console.error("Hook scorer AI error:", e);
      aiResult = { aiScore: 20, mainIssue: null, quickFix: null, hookType: "Standard" }; // fallback
    }

    let finalScore = patternScore + (aiResult.aiScore || 0);
    finalScore = Math.min(Math.max(finalScore, 0), 100);

    let grade = "C";
    if (finalScore >= 90) grade = "S";
    else if (finalScore >= 80) grade = "A";
    else if (finalScore >= 70) grade = "B";
    else if (finalScore >= 50) grade = "C";
    else grade = "D";

    res.json({
      score: finalScore,
      hookType: aiResult.hookType || "Standard",
      patternMatches,
      mainIssue: aiResult.mainIssue || null,
      quickFix: aiResult.quickFix || null,
      grade
    });

  } catch (error) {
    console.error("Hook scorer error:", error);
    res.status(500).json({ error: "Failed to score hook" });
  }
});

export default router;
