import { Router, type IRouter } from "express";
import { db, favoritesTable, contentGenerationsTable } from "@workspace/db";
import { eq, and, inArray } from "drizzle-orm";
import { requireAuth } from "../../middlewares/planMiddleware";
import { logger } from "../../lib/logger";

const router: IRouter = Router();

router.get("/", requireAuth, async (req: any, res): Promise<void> => {
  try {
    const rows = await db.select().from(favoritesTable).where(eq(favoritesTable.userId, req.userId));
    res.json({ ids: rows.map(r => r.generationId) });
  } catch (err) {
    logger.error({ err, userId: req.userId }, "Failed to fetch favorites");
    res.status(500).json({ error: "Failed to load saved items. Please try again." });
  }
});

router.get("/content", requireAuth, async (req: any, res): Promise<void> => {
  try {
    const favRows = await db.select().from(favoritesTable).where(eq(favoritesTable.userId, req.userId));
    if (favRows.length === 0) { res.json({ items: [] }); return; }
    const ids = favRows.map(r => r.generationId);
    const items = await db.select().from(contentGenerationsTable).where(
      and(eq(contentGenerationsTable.userId, req.userId), inArray(contentGenerationsTable.id, ids))
    );
    const savedAtMap = Object.fromEntries(favRows.map(r => [r.generationId, r.createdAt]));
    const sorted = items
      .map(item => ({ ...item, savedAt: savedAtMap[item.id] }))
      .sort((a, b) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime());
    res.json({ items: sorted });
  } catch (err) {
    logger.error({ err, userId: req.userId }, "Failed to fetch favorites content");
    res.status(500).json({ error: "Failed to load saved content. Please try again." });
  }
});

router.post("/:id", requireAuth, async (req: any, res): Promise<void> => {
  try {
    const generationId = parseInt(req.params.id, 10);
    if (isNaN(generationId)) { res.status(400).json({ error: "Invalid generation ID" }); return; }
    await db.insert(favoritesTable).values({ userId: req.userId, generationId }).onConflictDoNothing();
    res.json({ success: true, saved: true });
  } catch (err) {
    logger.error({ err, userId: req.userId }, "Failed to save favorite");
    res.status(500).json({ error: "Failed to save item. Please try again." });
  }
});

router.delete("/:id", requireAuth, async (req: any, res): Promise<void> => {
  try {
    const generationId = parseInt(req.params.id, 10);
    if (isNaN(generationId)) { res.status(400).json({ error: "Invalid generation ID" }); return; }
    await db.delete(favoritesTable).where(
      and(eq(favoritesTable.userId, req.userId), eq(favoritesTable.generationId, generationId))
    );
    res.json({ success: true, saved: false });
  } catch (err) {
    logger.error({ err, userId: req.userId }, "Failed to remove favorite");
    res.status(500).json({ error: "Failed to remove item. Please try again." });
  }
});

export default router;
