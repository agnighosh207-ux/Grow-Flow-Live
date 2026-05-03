import { Router, type IRouter } from "express";
import { db, favoritesTable, contentGenerationsTable } from "@workspace/db";
import { eq, and, inArray } from "drizzle-orm";
import { requireAuth } from "../../middlewares/planMiddleware";

const router: IRouter = Router();

router.get("/", requireAuth, async (req: any, res): Promise<void> => {
  const rows = await db
    .select()
    .from(favoritesTable)
    .where(eq(favoritesTable.userId, req.userId));
  res.json({ ids: rows.map(r => r.generationId) });
});

router.get("/content", requireAuth, async (req: any, res): Promise<void> => {
  const favRows = await db
    .select()
    .from(favoritesTable)
    .where(eq(favoritesTable.userId, req.userId));

  if (favRows.length === 0) {
    res.json({ items: [] });
    return;
  }

  const ids = favRows.map(r => r.generationId);
  const items = await db
    .select()
    .from(contentGenerationsTable)
    .where(and(
      eq(contentGenerationsTable.userId, req.userId),
      inArray(contentGenerationsTable.id, ids)
    ));

  const savedAtMap = Object.fromEntries(favRows.map(r => [r.generationId, r.createdAt]));
  const sorted = items
    .map(item => ({ ...item, savedAt: savedAtMap[item.id] }))
    .sort((a, b) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime());

  res.json({ items: sorted });
});

router.post("/:id", requireAuth, async (req: any, res): Promise<void> => {
  const generationId = parseInt(req.params.id, 10);
  if (isNaN(generationId)) {
    res.status(400).json({ error: "Invalid generation ID" });
    return;
  }

  await db
    .insert(favoritesTable)
    .values({ userId: req.userId, generationId })
    .onConflictDoNothing();

  res.json({ success: true, saved: true });
});

router.delete("/:id", requireAuth, async (req: any, res): Promise<void> => {
  const generationId = parseInt(req.params.id, 10);
  if (isNaN(generationId)) {
    res.status(400).json({ error: "Invalid generation ID" });
    return;
  }

  await db
    .delete(favoritesTable)
    .where(and(
      eq(favoritesTable.userId, req.userId),
      eq(favoritesTable.generationId, generationId)
    ));

  res.json({ success: true, saved: false });
});

export default router;
