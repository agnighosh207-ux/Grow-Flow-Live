import { Router, type IRouter } from "express";
import { db, templatesTable, usersTable } from "@workspace/db";
import { eq, and, desc, sql } from "drizzle-orm";
import { requireAuth } from "../../middlewares/planMiddleware";
import crypto from "crypto";

const router: IRouter = Router();

const requireAdmin = async (req: any, res: any, next: any) => {
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.userId));
  if (!user || !user.isAdmin) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }
  next();
};

router.get("/", requireAuth, async (req: any, res) => {
  try {
    const { category } = req.query;
    const conditions = [eq(templatesTable.isActive, true)];
    
    if (category && category !== "all") {
      conditions.push(eq(templatesTable.category, category as string));
    }

    const templates = await db
      .select()
      .from(templatesTable)
      .where(and(...conditions))
      .orderBy(desc(templatesTable.useCount));

    res.json(templates);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch templates" });
  }
});

router.post("/:id/use", requireAuth, async (req: any, res) => {
  try {
    await db.update(templatesTable)
      .set({ useCount: sql`${templatesTable.useCount} + 1` })
      .where(eq(templatesTable.id, req.params.id));
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to track template use" });
  }
});

// Admin only: Seed/Add templates
router.post("/", requireAuth, requireAdmin, async (req: any, res) => {
  try {
    const { name, category, platform, structure, exampleIdea, fills } = req.body;
    await db.insert(templatesTable).values({
      name,
      category,
      platform,
      structure,
      exampleIdea,
      fills,
      createdBy: req.userId
    });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to create template" });
  }
});

export default router;
