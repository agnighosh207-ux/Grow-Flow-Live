import { Router, type IRouter } from "express";
import { db, globalAnnouncementsTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";

let announcementCache: { data: any; timestamp: number } | null = null;
const CACHE_TTL = 60 * 1000; // 1 minute

const router = Router();

// Public route to get active announcement
router.get("/active", async (req: any, res: any) => {
  try {
    const now = Date.now();
    if (announcementCache && now - announcementCache.timestamp < CACHE_TTL) {
      res.json(announcementCache.data);
      return;
    }

    const activeList = await db
      .select()
      .from(globalAnnouncementsTable)
      .where(eq(globalAnnouncementsTable.isActive, true))
      .orderBy(desc(globalAnnouncementsTable.createdAt));

    const response = { announcements: activeList };
    announcementCache = { data: response, timestamp: now };
    res.json(response);
  } catch (error) {
    // Return empty on error — don't crash the page
    res.json({ announcements: [] });
  }
});

// Alias for /active used by some frontend components
router.get("/latest", async (req: any, res: any) => {
  try {
    const now = Date.now();
    if (announcementCache && now - announcementCache.timestamp < CACHE_TTL) {
      res.json(announcementCache.data);
      return;
    }
    const activeList = await db
      .select()
      .from(globalAnnouncementsTable)
      .where(eq(globalAnnouncementsTable.isActive, true))
      .orderBy(desc(globalAnnouncementsTable.createdAt));
    res.json({ announcements: activeList });
  } catch {
    res.json({ announcements: [] });
  }
});

export default router;
