import { Router, type IRouter, type Response } from "express";
import { requireAuth, requirePlanOrTrial } from "../../middlewares/planMiddleware";
import { enforceGenerationLimit, refundGenerationCredit } from "../../middlewares/generationLimiter";
import { invalidateAuthCache } from "../../middlewares/authSyncMiddleware";
import { generateContent, extractJson } from "../../services/ai-engine";
import { db, contentCalendarTable, usersTable, contentGenerationsTable } from "@workspace/db";
import { eq, and, sql, gte, lte } from "drizzle-orm";

const router: IRouter = Router();

router.get("/items", requireAuth, requirePlanOrTrial("calendar"), async (req: any, res: Response): Promise<void> => {
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

router.post("/items", requireAuth, requirePlanOrTrial("calendar"), async (req: any, res: Response): Promise<void> => {
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

router.patch("/items/:id", requireAuth, requirePlanOrTrial("calendar"), async (req: any, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
  const { date, idea, platform, contentType, scheduledTime, notes, color, status } = req.body;
  const updateData: any = {};
  if (date !== undefined) updateData.date = new Date(date);
  if (idea !== undefined) updateData.idea = String(idea).substring(0, 500);
  if (platform !== undefined) updateData.platform = String(platform).substring(0, 50);
  if (contentType !== undefined) updateData.contentType = String(contentType).substring(0, 50);
  if (scheduledTime !== undefined) updateData.scheduledTime = String(scheduledTime).substring(0, 20);
  if (notes !== undefined) updateData.notes = String(notes).substring(0, 1000);
  if (color !== undefined) updateData.color = String(color).substring(0, 20);
  if (status !== undefined) updateData.status = String(status).substring(0, 20);

  if (Object.keys(updateData).length === 0) {
    res.status(400).json({ error: "No valid fields to update" });
    return;
  }

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

router.delete("/items/:id", requireAuth, requirePlanOrTrial("calendar"), async (req: any, res: Response): Promise<void> => {
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

router.post("/ai-schedule", requireAuth, requirePlanOrTrial("calendar"), async (req: any, res: Response): Promise<void> => {
  const { niche, goal, daysAhead, existingItems } = req.body;

  const sanitizedNiche = typeof niche === 'string' ? niche.substring(0, 50).replace(/[`<>{}\\]/g, '') : 'General';
  const sanitizedGoal = typeof goal === 'string' ? goal.substring(0, 100).replace(/[`<>{}\\]/g, '') : 'Growth';
  const sanitizedDays = Math.min(Math.max(Number(daysAhead) || 7, 1), 30);
  const sanitizedItems = Array.isArray(existingItems) 
    ? existingItems.slice(0, 50).map(item => ({ 
        date: typeof item?.date === 'string' ? item.date.substring(0, 10) : '', 
        platform: typeof item?.platform === 'string' ? item.platform.substring(0, 20) : '' 
      }))
    : [];

  const systemPrompt = `You are a content scheduling strategist. Create an optimal posting schedule avoiding the dates that already have content. Consider platform best practices for posting times and days. Return a JSON schedule array. Return ONLY valid JSON.`;
  const userPrompt = `
NICHE: ${sanitizedNiche}
GOAL: ${sanitizedGoal}
DURATION: ${sanitizedDays} days
EXISTING CONTENT DATES: ${JSON.stringify(sanitizedItems)}

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

    const results = await Promise.allSettled(
      schedule.map((s: any) => {
        const date = new Date(s.date);
        if (isNaN(date.getTime())) return Promise.reject(new Error('Invalid date'));
        return db.insert(contentCalendarTable).values({
          userId: req.userId,
          date,
          idea: String(s.topic || '').substring(0, 500),
          platform: String(s.platform || 'Instagram').substring(0, 50),
          contentType: String(s.contentType || 'Educational').substring(0, 50),
          scheduledTime: String(s.bestTime || '').substring(0, 20),
          notes: String(s.reasoning || '').substring(0, 500),
          status: "planned"
        }).returning();
      })
    );
    
    const insertedItems = results
      .filter(r => r.status === 'fulfilled')
      .flatMap(r => (r as PromiseFulfilledResult<any>).value);

    if (insertedItems.length === 0) {
      res.status(503).json({ error: "No schedule items could be saved. Please try again." });
      return;
    }

    res.json({ schedule: insertedItems, skipped: results.filter(r => r.status === 'rejected').length });
  } catch (err) {
    console.error("AI SCHEDULE ERROR:", err);
    res.status(503).json({ error: "AI Scheduling failed. Please try again." });
  }
});

router.post("/items/:id/generate", requireAuth, requirePlanOrTrial("calendar"), enforceGenerationLimit, async (req: any, res: Response): Promise<void> => {
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

    const safePlatform = String(item.platform || 'Instagram').substring(0, 30);
    const safeIdea = String(item.idea || '').substring(0, 300).replace(/[`<>{}\\]/g, '');
    const safeContentType = String(item.contentType || 'Educational').substring(0, 30);

    // Call the AI engine directly with high-quality instructions
    const systemPrompt = `You are a world-class content creator. Generate viral content for ${safePlatform}. Topic: ${safeIdea}. Content Type: ${safeContentType}. Return ONLY valid JSON.`;
    
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
    invalidateAuthCache(req.userId);
  } catch (err: any) {
    console.error("CALENDAR GENERATE ERROR:", err);
    res.status(500).json({ error: "Generation failed. Please try again." });
  }
});

export default router;
