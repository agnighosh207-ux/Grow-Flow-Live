import { Router, type IRouter } from "express";
import { requireAuth, requirePlanOrTrial } from "../../middlewares/planMiddleware";
import { enforceGenerationLimit } from "../../middlewares/generationLimiter";
import { generateContent, extractJson } from "../../services/ai-engine";
import { db, vaultItemsTable } from "@workspace/db";
import { eq, and, sql } from "drizzle-orm";

const router: IRouter = Router();

router.get("/items", async (req, res): Promise<void> => {
  const { niche, platform, format, limit = 20 } = req.query;
  const conditions = [eq(vaultItemsTable.isActive, true)];

  if (niche && niche !== "All") conditions.push(eq(vaultItemsTable.niche, String(niche)));
  if (platform && platform !== "All") conditions.push(eq(vaultItemsTable.platform, String(platform)));
  if (format && format !== "All") conditions.push(eq(vaultItemsTable.format, String(format)));

  const limitNum = Math.min(Number(limit) || 20, 50);

  try {
    const items = await db.select()
      .from(vaultItemsTable)
      .where(and(...conditions))
      .limit(limitNum);

    const [countResult] = await db.select({ count: sql`count(*)` })
      .from(vaultItemsTable)
      .where(and(...conditions));

    res.json({ items, total: Number(countResult.count) });
  } catch (err) {
    console.error("Vault items fetch error:", err);
    res.status(500).json({ error: "Failed to fetch vault items" });
  }
});

router.post("/remix", requirePlanOrTrial("vault"), enforceGenerationLimit, async (req: any, res): Promise<void> => {
  const { vaultItemId, userTopic, userNiche, tone } = req.body;

  if (!vaultItemId || !userTopic) {
    res.status(400).json({ error: "Vault item ID and topic are required" });
    return;
  }

  try {
    const [item] = await db.select().from(vaultItemsTable).where(eq(vaultItemsTable.id, vaultItemId));
    if (!item) {
      res.status(404).json({ error: "Vault item not found" });
      return;
    }

    const systemPrompt = `You are a viral content strategist. Remix this proven content structure for a new topic. Keep the same psychological pattern and format but make it completely original for the new topic. Return ONLY valid JSON.`;
    const userPrompt = `
ORIGINAL PATTERN:
- Hook: ${item.hookText}
- Format: ${item.format}
- Why it worked: ${item.whyItWorks}

NEW TOPIC:
- Topic: ${userTopic}
- Niche: ${userNiche || "General"}
- Tone: ${tone || "Professional"}

Return JSON:
{
  "remixedHook": "string",
  "remixedCaption": "string",
  "remixTip": "string"
}
`;

    const response = await generateContent({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      userPlan: "FREE", // Use Groq llama-3.1-8b-instant as requested
      userId: req.userId,
      maxTokens: 800,
    });

    const content = response.choices[0]?.message?.content || "{}";
    const parsed = extractJson(content);
    
    if (!parsed || !parsed.remixedHook) {
        throw new Error("AI_RESPONSE_MALFORMED");
    }

    res.json(parsed);
  } catch (err: any) {
    console.error("VAULT REMIX ERROR:", err);
    res.status(503).json({ error: "Remix service unavailable. Please try again." });
  }
});

export default router;
