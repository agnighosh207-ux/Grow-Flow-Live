import { Router, type IRouter } from "express";
import { db, globalAnnouncementsTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";

const router: IRouter = Router();

// Public route to get active announcement
router.get("/announcements/active", async (req: any, res: any) => {
  try {
    const [active] = await db
      .select()
      .from(globalAnnouncementsTable)
      .where(eq(globalAnnouncementsTable.isActive, true))
      .orderBy(desc(globalAnnouncementsTable.createdAt))
      .limit(1);

    if (!active) {
      return res.json({ announcement: null });
    }

    res.json({ announcement: active });
  } catch (error) {
    console.error("Failed to fetch announcement:", error);
    res.status(500).json({ error: "Failed to fetch announcement" });
  }
});

export default router;
