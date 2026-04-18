import { Router, type IRouter } from "express";
import { requireAuth } from "../../middlewares/planMiddleware";
import { db, contentCalendarTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";

const router: IRouter = Router();

router.get("/calendar", requireAuth, async (req: any, res): Promise<void> => {
  try {
    const calendarItems = await db
      .select()
      .from(contentCalendarTable)
      .where(eq(contentCalendarTable.userId, req.userId))
      .orderBy(desc(contentCalendarTable.date));
    
    res.json({ calendar: calendarItems });
  } catch (err: any) {
    res.status(500).json({ error: "Failed to fetch calendar." });
  }
});

export default router;
