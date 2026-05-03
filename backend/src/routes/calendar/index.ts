import { Router, type IRouter, type Response } from "express";
import { requireAuth, requirePlanOrTrial } from "../../middlewares/planMiddleware";
import { enforceGenerationLimit } from "../../middlewares/generationLimiter";
import { generateContent, extractJson } from "../../services/ai-engine";
import { db, contentCalendarTable, usersTable, contentGenerationsTable } from "@workspace/db";
import { eq, and, sql, gte, lte } from "drizzle-orm";

const router: IRouter = Router();

router.get("/items", requirePlanOrTrial("calendar"), async (req: any, res: Response): Promise<void> => {
  const { month, year } = req.query;
  if (!month || !year) {
    res.status(400).json({ error: "Month and year are required" });
    return;
  }

  const start = new Date(`${year}-${month}-01T00:00:00Z`);
  const end = new Date(Number(year), Number(month), 0, 23, 59, 59, 999);

  try {
    const items = await db.select()
      .from(contentCalendarTable)
      .where(and(
        eq(contentCalendarTable.userId, req.userId),
        gte(contentCalendarTable.date, start),
        lte(contentCalendarTable.date, end)
      ));

    const grouped: Record<string, any[]> = {};
    items.forEach(item => {
      const dateStr = item.date.toISOString().split("T")[0];
      if (!grouped[dateStr]) grouped[dateStr] = [];
      grouped[dateStr].push(item);
    });

    res.json(grouped);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch calendar items" });
  }
});

router.post("/items", requirePlanOrTrial("calendar"), async (req: any, res: Response): Promise<void> => {
  const { date, idea, platform, contentType, scheduledTime, notes, color } = req.body;
  
  try {
    const [item] = await db.insert(contentCalendarTable)
      .values({
        userId: req.userId,
        date: new Date(date),
        idea,
        platform,
        contentType,
        scheduledTime,
        notes,
        color,
        status: "planned"
      })
      .returning();
    res.json(item);
  } catch (err) {
    res.status(500).json({ error: "Failed to create calendar item" });
  }
});

router.patch("/items/:id", requirePlanOrTrial("calendar"), async (req: any, res: Response): Promise<void> => {
  const { id } = req.params;
  const updates = req.body;
  
  try {
    const updateData: any = { ...updates };
    if (updates.date) updateData.date = new Date(updates.date);

    const [item] = await db.update(contentCalendarTable)
      .set(updateData)
      .where(and(
        eq(contentCalendarTable.id, Number(id)),
        eq(contentCalendarTable.userId, req.userId)
      ))
      .returning();
    
    if (!item) {
      res.status(404).json({ error: "Item not found" });
      return;
    }
    res.json(item);
  } catch (err) {
    res.status(500).json({ error: "Failed to update calendar item" });
  }
});

router.delete("/items/:id", requirePlanOrTrial("calendar"), async (req: any, res: Response): Promise<void> => {
  try {
    const result = await db.delete(contentCalendarTable)
      .where(and(
        eq(contentCalendarTable.id, Number(req.params.id)),
        eq(contentCalendarTable.userId, req.userId)
      ));
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete calendar item" });
  }
});

router.post("/ai-schedule", requirePlanOrTrial("calendar"), async (req: any, res: Response): Promise<void> => {
  const { niche, goal, daysAhead, existingItems } = req.body;

  const systemPrompt = `You are a content scheduling strategist. Create an optimal posting schedule avoiding the dates that already have content. Consider platform best practices for posting times and days. Return a JSON schedule array. Return ONLY valid JSON.`;
  const userPrompt = `
NICHE: ${niche || "General"}
GOAL: ${goal || "Growth"}
DURATION: ${daysAhead || 7} days
EXISTING CONTENT DATES: ${JSON.stringify(existingItems || [])}

Return JSON:
{
  "schedule": [
    { "date": "YYYY-MM-DD", "platform": "Instagram" | "Twitter" | "LinkedIn" | "YouTube", "contentType": "string", "topic": "string", "hook": "string", "bestTime": "string", "reasoning": "string" }
  ]
}
`;

  try {
    const response = await generateContent({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      userPlan: "FREE",
      userId: req.userId,
      maxTokens: 2500,
    });

    const parsed = extractJson(response.choices[0]?.message?.content || "{}");
    const schedule = parsed.schedule || [];

    if (schedule.length === 0) {
        res.status(503).json({ error: "No schedule generated. Please try again." });
        return;
    }

    const insertedItems = await Promise.all(schedule.map((s: any) => 
      db.insert(contentCalendarTable).values({
        userId: req.userId,
        date: new Date(s.date),
        idea: s.topic,
        platform: s.platform,
        contentType: s.contentType,
        scheduledTime: s.bestTime,
        notes: s.reasoning,
        status: "planned"
      }).returning()
    ));

    res.json({ schedule: insertedItems.flat() });
  } catch (err) {
    console.error("AI SCHEDULE ERROR:", err);
    res.status(503).json({ error: "AI Scheduling failed. Please try again." });
  }
});

router.post("/items/:id/generate", requirePlanOrTrial("calendar"), enforceGenerationLimit, async (req: any, res: Response): Promise<void> => {
  const { id } = req.params;

  try {
    const [item] = await db.select().from(contentCalendarTable).where(and(
      eq(contentCalendarTable.id, Number(id)),
      eq(contentCalendarTable.userId, req.userId)
    ));

    if (!item) {
      res.status(404).json({ error: "Item not found" });
      return;
    }

    // Call the AI engine directly with high-quality instructions
    const systemPrompt = `You are a world-class content creator. Generate viral content for ${item.platform}. Topic: ${item.idea}. Content Type: ${item.contentType}. Return ONLY valid JSON.`;
    
    const response = await generateContent({
        messages: [{ role: "system", content: systemPrompt }, { role: "user", content: `Generate the full content for this ${item.contentType} post.` }],
        userPlan: "FREE",
        userId: req.userId,
        maxTokens: 2000
    });

    const content = extractJson(response.choices[0]?.message?.content || "{}");

    const [savedGen] = await db.insert(contentGenerationsTable).values({
        userId: req.userId,
        idea: item.idea,
        contentType: item.contentType,
        tone: "Professional",
        content: content
    }).returning();

    await db.update(contentCalendarTable)
        .set({ generationId: String(savedGen.id), status: "draft" })
        .where(eq(contentCalendarTable.id, item.id));

    res.json({ content, generationId: savedGen.id });
  } catch (err: any) {
    console.error("CALENDAR GENERATE ERROR:", err);
    res.status(500).json({ error: "Generation failed. Please try again." });
  }
});

export default router;
