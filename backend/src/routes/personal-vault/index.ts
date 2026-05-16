import { Router, type IRouter } from "express";
import { z } from "zod";
import { requireAuth, requirePlanOrTrial } from "../../middlewares/planMiddleware";
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
    console.error("FOLDERS FETCH ERROR:", err);
    res.status(500).json({ error: "Failed to fetch folders" });
    return;
  }
});

router.post("/folders", requireAuth, requirePlanOrTrial("personal-vault"), async (req: any, res): Promise<void> => {
  const name = typeof req.body.name === "string" ? req.body.name : "";
  const color = typeof req.body.color === "string" ? req.body.color : "#06b6d4";
  const icon = typeof req.body.icon === "string" ? req.body.icon : "Folder";
  if (typeof name !== "string" || !name.trim()) {
    res.status(400).json({ error: "Folder name must be a valid string" });
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
    console.error("FOLDER CREATE ERROR:", err);
    res.status(500).json({ error: "Failed to create folder" });
    return;
  }
});

const querySchema = z.object({
  folderId: z.string().nullable().optional(),
  search: z.string().default(""),
  platform: z.string().nullable().optional(),
  tags: z.string().nullable().optional(),
  limit: z.coerce.number().default(20),
});

// Items (Content Bank)
router.get("/items", requireAuth, async (req: any, res): Promise<void> => {
  try {
    const validated = querySchema.parse(req.query);
    const { folderId, search, platform, tags, limit } = validated;
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

    const items = await db.select().from(contentGenerationsTable)
      .where(and(...conditions))
      .orderBy(desc(contentGenerationsTable.createdAt))
      .limit(Number(limit));
    
    res.json(items);
  } catch (err) {
    console.error("VAULT LIST ERROR:", err);
    res.status(500).json({ error: "Failed to fetch bank items" });
  }
});

// Actions
router.patch("/items/:id", requireAuth, requirePlanOrTrial("personal-vault"), async (req: any, res): Promise<void> => {
  const { id } = req.params;
  const tags = Array.isArray(req.body.tags) ? req.body.tags : undefined;
  const folderId = typeof req.body.folderId === "string" ? req.body.folderId : undefined;
  const performanceNote = typeof req.body.performanceNote === "string" ? req.body.performanceNote : undefined;
  const isFavorited = typeof req.body.isFavorited === "boolean" ? req.body.isFavorited : undefined;

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
    console.error("VAULT UPDATE ERROR:", err);
    res.status(500).json({ error: "Failed to update content item" });
    return;
  }
});

export default router;
