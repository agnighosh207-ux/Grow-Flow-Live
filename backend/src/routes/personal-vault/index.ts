import { Router, type IRouter } from "express";
import { requireAuth } from "../../middlewares/planMiddleware";
import { db, contentGenerationsTable, foldersTable } from "@workspace/db";
import { eq, and, sql, desc, or, ilike } from "drizzle-orm";
import { nanoid } from "nanoid";

const router: IRouter = Router();

// Folders
router.get("/folders", requireAuth, async (req: any, res): Promise<void> => {
  try {
    const folders = await db.select().from(foldersTable)
      .where(eq(foldersTable.userId, req.userId))
      .orderBy(desc(foldersTable.createdAt));
    res.json(folders);
    return;
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch folders" });
    return;
  }
});

router.post("/folders", requireAuth, async (req: any, res): Promise<void> => {
  const { name, color, icon } = req.body;
  if (!name) {
    res.status(400).json({ error: "Folder name is required" });
    return;
  }

  try {
    const id = nanoid();
    await db.insert(foldersTable).values({
      id,
      userId: req.userId,
      name,
      color: color || "#06b6d4",
      icon: icon || "Folder",
    });
    res.json({ success: true, id });
    return;
  } catch (err) {
    res.status(500).json({ error: "Failed to create folder" });
    return;
  }
});

// Items (Content Bank)
router.get("/items", requireAuth, async (req: any, res): Promise<void> => {
  const { folderId, search, platform, tags, limit = 20 } = req.query;
  const conditions = [eq(contentGenerationsTable.userId, req.userId)];

  if (folderId) conditions.push(eq(contentGenerationsTable.folderId, String(folderId)));
  if (platform) conditions.push(eq(contentGenerationsTable.platform, String(platform)));
  if (search) {
    const searchCondition = or(
      ilike(contentGenerationsTable.idea, `%${search}%`),
      sql`${contentGenerationsTable.content}::text ILIKE ${`%${search}%`}`
    );
    if (searchCondition) conditions.push(searchCondition);
  }
  if (tags) {
    const tagList = String(tags).split(",");
    conditions.push(sql`${contentGenerationsTable.tags} && ${tagList}`);
  }

  try {
    const items = await db.select().from(contentGenerationsTable)
      .where(and(...conditions))
      .orderBy(desc(contentGenerationsTable.createdAt))
      .limit(Number(limit));
    
    res.json(items);
    return;
  } catch (err) {
    console.error("Content bank fetch error:", err);
    res.status(500).json({ error: "Failed to fetch content bank items" });
    return;
  }
});

// Actions
router.patch("/items/:id", requireAuth, async (req: any, res): Promise<void> => {
  const { id } = req.params;
  const { tags, folderId, performanceNote, isFavorited } = req.body;

  try {
    await db.update(contentGenerationsTable)
      .set({
        ...(tags !== undefined && { tags }),
        ...(folderId !== undefined && { folderId }),
        ...(performanceNote !== undefined && { performanceNote }),
        ...(isFavorited !== undefined && { isFavorited }),
      })
      .where(and(eq(contentGenerationsTable.id, Number(id)), eq(contentGenerationsTable.userId, req.userId)));
    
    res.json({ success: true });
    return;
  } catch (err) {
    res.status(500).json({ error: "Failed to update content item" });
    return;
  }
});

export default router;
