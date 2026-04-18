import { Router, type IRouter } from "express";
import { openai } from "@workspace/integrations-openai-ai-server";
import { requireAuth, requirePlanOrTrial, consumeToolTrial } from "../../middlewares/planMiddleware";

const router: IRouter = Router();

router.post("/repurpose", requireAuth, requirePlanOrTrial("content"), async (req: any, res): Promise<void> => {
  const { content, targetFormat } = req.body;

  if (!content || !targetFormat) {
    res.status(400).json({ error: "Missing content or targetFormat" });
    return;
  }

  const systemPrompt = `You are a master content repurposer. Your job is to take an existing piece of content and adapt it into a ${targetFormat}.
Maintain the core message, tone, and value proposition of the original, but format it specifically for the requested platform.

Target formats generally expected:
- "Convert to Twitter Thread": Output should be a connected thread, engaging, punchy, easily readable. Use numbering like "1/" if appropriate.
- "Convert to LinkedIn Post": Professional tone, broken into easily skimmable paragraphs, engaging hook and strong call to action.
- "Convert to Reel Script": Short, engaging script. Include visual/audio cues in brackets like [Hook], [Visual: point to text], and the spoken script.

Return ONLY a JSON response in the following format (no markdown):
{
  "repurposedContent": "The full repurposed text goes here"
}`;

  try {
    const response = await openai.chat.completions.create({
      model: "llama-3.1-8b-instant",
      response_format: { type: "json_object" },
      max_tokens: 3000,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Original Content:\n${content}\n\nTarget Format:\n${targetFormat}` },
      ],
    });

    const rawContent = response.choices[0]?.message?.content ?? "{}";
    let parsed: any;
    try {
      parsed = JSON.parse(rawContent);
    } catch {
      const jsonMatch = rawContent.match(/\{[\s\S]*\}/);
      parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : { repurposedContent: "" };
    }

    if (req.trialMode) {
      await consumeToolTrial(req.userId, "content");
    }

    res.json({ result: parsed.repurposedContent });
  } catch (err: any) {
    res.status(500).json({ error: "Failed to repurpose content." });
  }
});

export default router;
